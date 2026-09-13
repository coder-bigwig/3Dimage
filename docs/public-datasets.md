# Public CT data import

## Blender demo in the shared viewer

The local Compose frontend enables `VITE_ENABLE_BLENDER_DEMO=true` through the
`ENABLE_BLENDER_DEMO` build argument. This exposes the public Blender model at
`http://localhost:8088/share/viewer` in the existing viewer shell. The default
Dockerfile argument is false; authenticated share-token routes keep their
existing API flow. This alias is a local public-data demo, not a private share.

Export an approved trial scene with:

```powershell
& 'D:/tools/blender-portable/blender-4.5.9-windows-x64/blender.exe' --background `
  'D:/3Dimage/public-data/blender-trial/lung-reference-trial.blend' `
  --python 'D:/3Dimage/scripts/model-pipeline/export-blender-viewer.py'
```

The exporter reads `report.json` beside the scene to undo the trial's centering
and scaling, exports eight independent GLBs in original RAS millimeters, and
copies the matching CT descriptor, volume and segmentation statistics. Output:
`front/public/public-data/blender-trial/manifest.json`. Its `renderStyle: clinical`
selects the approved shell shading and lighting without changing unrelated
manifests. The source dataset has five lobes, not bronchopulmonary segments.

After export, rebuild and recreate the Compose frontend. A local offline update
can also build Vite with `VITE_API_BASE_URL=/api/v1` and
`VITE_ENABLE_BLENDER_DEMO=true`, then copy the resulting distribution into a
runtime image based on the existing frontend image. Preserve the previous image
tag for rollback. The initial local integration preserved
`compose-front:before-blender-v2`.

The first integration target is MSD Task06 Lung. The official MSD index publishes the task data from AWS; a mirrored single-case NIfTI file is used by the local import helper so developers can validate the pipeline without committing imaging data. MSD Task06 Lung contains thoracic CT volumes with tumor labels. CT-ORG remains a second option for multi-organ validation, but its official download is much larger and requires a separate access workflow.

Run the importer outside the repository (the default work root resolves to the
workspace's `D:\3Dimage\public-data`; pass it explicitly when using another
checkout). On Windows use Windows PowerShell; `pwsh` (PowerShell 7) is not
required and may not be installed:

```powershell
& .\scripts\public-data\import-msd-lung.ps1 `
  -CaseId lung_001 `
  -WorkRoot D:\3Dimage\public-data `
  -TotalSegmentatorHome D:\AI\TotalSegmentator `
  -Device gpu -KeepInput
```

The script runs two TotalSegmentator tasks and writes one directory per task
under `segmentations/`:

- `total` (ROI subset of the five lung lobes) → `segmentations/lung/`
- `lung_vessels` → `segmentations/lung_vessels/` — supplies `lung_airways`
  (气管), `lung_arteries` (动脉) and `lung_veins` (静脉)

Pass `-Tasks lung_vessels` to run only the vessel task, or `-Tasks total` for a
lobes-only import. The script downloads one public case, invokes the D-drive
TotalSegmentator launcher, and writes the input NIfTI, ROI masks, model cache,
and import summary only on D:. The generated NIfTI and masks are ignored by Git.
To use a different executable, point `-TotalSegmentatorHome` at another
TotalSegmentator install (it expects `venv\Scripts\TotalSegmentator.exe`).

The script calls the executable directly rather than the bundled `run.ps1`
launcher: under Windows PowerShell 5.1 that launcher sets
`$ErrorActionPreference = 'Stop'`, which turns TotalSegmentator's stderr progress
output into a terminating error and aborts the run halfway.

Convert the masks to GLB quality variants and publish the browser manifest
(`--mask-root` points at the case `segmentations/` root; the deprecated
`--mask-dir` still works and is treated as its `lung/` parent):

```powershell
& D:\AI\TotalSegmentator\venv\Scripts\python.exe `
  scripts/public-data/build-msd-lung-glb.py `
  --mask-root D:\3Dimage\public-data\lung_001\segmentations `
  --output-root D:\3Dimage\front\public\public-data\msd-lung\lung_001 `
  --case-id lung_001 `
  --public-manifest D:\3Dimage\front\public\public-data\manifest.json `
  --asset-base-url /public-data/msd-lung/lung_001
```

Layers whose mask is absent are skipped, so a lobes-only import still produces a
usable manifest. `statistics.json` from every task directory is merged into one
file beside the case manifest, which is what lets the viewer show real volumes.

Emit the 2D volume asset the browser image viewer reads (reoriented to RAS,
block-averaged to 256×256×152 int16, ~19 MB):

```powershell
& D:\AI\TotalSegmentator\venv\Scripts\python.exe `
  scripts/public-data/build-ct-volume.py `
  --input D:\3Dimage\public-data\lung_001\input\lung_001.nii.gz `
  --output-root D:\3Dimage\front\public\public-data\msd-lung\lung_001 `
  --case-id lung_001
```

This writes `volume.bin` plus `ct-volume.json` beside the GLB layers, and the
manifest picks the descriptor up from the case directory. The descriptor carries
spacing, the HU range, the default window and non-identifying metadata only —
never invent patient fields.

Place the generated `manifest.json` and its GLB files under `front/public/public-data/` for local development, or set `VITE_PUBLIC_DATA_MANIFEST_URL` to a public manifest URL. Then open `http://localhost:5173/public-data`. The loader omits credentials and rejects asset URLs containing query strings or fragments, preventing signed URLs and access tokens from entering this public-data path.

The local Docker demo share uses the same generated GLBs. After conversion, recreate
`minio-init` so it seeds `rs1` through `rs5` from `front/public/public-data/`; if the
files are missing, initialization fails instead of silently installing fake geometry.

Sources:

- MSD official data index: https://medicaldecathlon.com/dataaws/
- MSD Lung mirror used for the single-case helper: https://huggingface.co/datasets/Aajin/msd-lung
- CT-ORG official collection: https://www.cancerimagingarchive.net/collection/ct-org/

Do not add patient-level files, derived masks, private access URLs, or signed object URLs to this repository.
