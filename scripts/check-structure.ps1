$required = @(
    'front/package.json',
    'backend/pom.xml',
    'docs/api/openapi.yaml',
    'deploy/compose/docker-compose.yml'
)

$missing = $required | Where-Object { -not (Test-Path -LiteralPath $_) }

if ($missing.Count -gt 0) {
    Write-Error ('Missing required paths: ' + ($missing -join ', '))
    exit 1
}

Write-Output 'Repository structure OK'
