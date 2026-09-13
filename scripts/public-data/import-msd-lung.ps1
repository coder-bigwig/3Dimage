[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $CaseId,
  [string] $WorkRoot = (Join-Path $PSScriptRoot '..\..\public-data'),
  [string] $TotalSegmentatorHome = 'D:\AI\TotalSegmentator',
  [ValidateSet('cpu', 'gpu', 'mps')] [string] $Device = 'cpu',
  [ValidateSet('total', 'lung_vessels')] [string[]] $Tasks = @('total', 'lung_vessels'),
  [switch] $KeepInput
)

$ErrorActionPreference = 'Stop'
$casePattern = '^lung_[0-9]{3}$'
if ($CaseId -notmatch $casePattern) { throw "CaseId must look like lung_001 (got '$CaseId')" }

# TotalSegmentator writes its progress bar to stderr. Under Windows PowerShell 5.1
# a native command writing to stderr becomes a terminating error while
# $ErrorActionPreference is 'Stop', so the tool launcher aborts mid-run. Call the
# executable directly and relax the preference around the invocation only.
$totalsegExe = Join-Path $TotalSegmentatorHome 'venv\Scripts\TotalSegmentator.exe'
if (-not (Test-Path -LiteralPath $totalsegExe)) { throw "TotalSegmentator executable not found: $totalsegExe" }
$env:TOTALSEG_HOME_DIR = Join-Path $TotalSegmentatorHome '.totalsegmentator'
$env:TOTALSEG_WEIGHTS_PATH = Join-Path $env:TOTALSEG_HOME_DIR 'nnunet\results'

function Invoke-TotalSegmentator {
  param([string[]] $Arguments)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    # The tool prints its progress to stdout and stderr. Forward both to the host so
    # they stay visible, but keep them out of this function's return value — otherwise
    # the caller receives "text...text 0" instead of the numeric exit code.
    & $totalsegExe @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
}

$caseRoot = Join-Path $WorkRoot $CaseId
$inputDir = Join-Path $caseRoot 'input'
$outputDir = Join-Path $caseRoot 'segmentations'
New-Item -ItemType Directory -Force -Path $inputDir, $outputDir | Out-Null

# MSD publishes this file without authentication. Keep it as a script constant so
# no signed URL or credential can accidentally enter the repository.
$imageUrl = "https://huggingface.co/datasets/Aajin/msd-lung/resolve/main/imagesTr/$CaseId.nii.gz"
$imagePath = Join-Path $inputDir "$CaseId.nii.gz"
if (-not (Test-Path -LiteralPath $imagePath)) {
  Invoke-WebRequest -Uri $imageUrl -OutFile $imagePath
}

$segmented = @()

if ($Tasks -contains 'total') {
  # Lung lobes: the five lobe classes the reference structure bar groups under 肺.
  $lobeDir = Join-Path $outputDir 'lung'
  $lungRois = @(
    'lung_upper_lobe_left',
    'lung_lower_lobe_left',
    'lung_upper_lobe_right',
    'lung_middle_lobe_right',
    'lung_lower_lobe_right'
  )
  Write-Host "TotalSegmentator: task=total modality=CT device=$Device speed=fast ROI=$($lungRois -join ',') statistics=enabled"
  $lobeArgs = @('-i', $imagePath, '-o', $lobeDir, '--task', 'total', '--device', $Device, '--fast', '--statistics', '--roi_subset') + $lungRois
  $code = Invoke-TotalSegmentator -Arguments $lobeArgs
  if ($code -ne 0) { throw "TotalSegmentator (total) failed with exit code $code" }
  $segmented += $lobeDir
}

if ($Tasks -contains 'lung_vessels') {
  # Airways and pulmonary vessels: these become the 气管 / 动脉 / 静脉 layers.
  $vesselDir = Join-Path $outputDir 'lung_vessels'
  Write-Host "TotalSegmentator: task=lung_vessels modality=CT device=$Device statistics=enabled"
  $code = Invoke-TotalSegmentator @('-i', $imagePath, '-o', $vesselDir, '--task', 'lung_vessels', '--device', $Device, '--statistics')
  if ($code -ne 0) { throw "TotalSegmentator (lung_vessels) failed with exit code $code" }
  $segmented += $vesselDir
}

$result = [ordered]@{
  schemaVersion = 1
  dataset = 'MSD Task06 Lung'
  source = 'https://medicaldecathlon.com/dataaws/'
  caseId = $CaseId
  inputNifti = $imagePath
  tasks = $Tasks
  segmentationDirectories = $segmented
  nextStep = 'Run scripts/public-data/build-msd-lung-glb.py --mask-root <segmentations>; do not copy this directory into the repository.'
}
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $caseRoot 'import-result.json') -Encoding utf8
Write-Host "Imported $CaseId into $caseRoot"
if (-not $KeepInput) { Remove-Item -LiteralPath $imagePath -Force }
