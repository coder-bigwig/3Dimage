"""Convert TotalSegmentator NIfTI masks into self-contained GLB viewer layers.

This script is intentionally local-data tooling. It writes generated imaging data
under the caller-provided D: drive output root; no source volume or mask is
copied into the repository history.

Masks are read from per-task sub-directories under ``--mask-root`` (``lung`` for
the lobes, ``lung_vessels`` for the airways and pulmonary vessels). Layers that
have no mask on disk are skipped, so a lobe-only import still produces a usable
manifest.
"""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

import nibabel as nib
import numpy as np
import vtk
from skimage import measure
from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy


# (task directory, mask name, display name, color, opacity, optional)
LAYER_DEFINITIONS = (
    ("lung", "lung_upper_lobe_left", "Left upper lobe", "#7DD3FC", 0.72, False),
    ("lung", "lung_lower_lobe_left", "Left lower lobe", "#38BDF8", 0.72, False),
    ("lung", "lung_upper_lobe_right", "Right upper lobe", "#A78BFA", 0.72, False),
    ("lung", "lung_middle_lobe_right", "Right middle lobe", "#C084FC", 0.72, False),
    ("lung", "lung_lower_lobe_right", "Right lower lobe", "#F0ABFC", 0.72, False),
    ("lung_vessels", "lung_arteries", "肺动脉", "#E45756", 0.95, True),
    ("lung_vessels", "lung_veins", "肺静脉", "#4E79CE", 0.95, True),
    ("lung_vessels", "lung_airways", "气管", "#F2F2F2", 1.0, True),
)
QUALITY_REDUCTIONS = {"canonical": 0.0, "high": 0.35, "medium": 0.60, "low": 0.80}


def align4(data: bytes, fill: bytes = b"\x00") -> bytes:
    return data + fill * ((-len(data)) % 4)


def accessor_min_max(values: np.ndarray) -> tuple[list[float], list[float]]:
    return values.min(axis=0).astype(float).tolist(), values.max(axis=0).astype(float).tolist()


def make_glb(vertices: np.ndarray, normals: np.ndarray, faces: np.ndarray) -> bytes:
    positions = np.asarray(vertices, dtype="<f4")
    normal_data = np.asarray(normals, dtype="<f4")
    indices = np.asarray(faces, dtype="<u4").reshape(-1)

    position_bytes = positions.tobytes(order="C")
    normal_bytes = normal_data.tobytes(order="C")
    index_bytes = indices.tobytes(order="C")
    position_offset = 0
    normal_offset = len(position_bytes)
    index_offset = len(position_bytes) + len(normal_bytes)
    binary = align4(position_bytes) + align4(normal_bytes) + align4(index_bytes)

    document = {
        "asset": {"version": "2.0", "generator": "medical3d-msd-lung"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{
            "attributes": {"POSITION": 0, "NORMAL": 1},
            "indices": 2,
            "material": 0,
            "mode": 4,
        }]}],
        "materials": [{"pbrMetallicRoughness": {
            "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
            "metallicFactor": 0.0,
            "roughnessFactor": 0.82,
        }}],
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": position_offset, "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": normal_offset, "byteLength": len(normal_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(index_bytes), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(positions), "type": "VEC3", "min": accessor_min_max(positions)[0], "max": accessor_min_max(positions)[1]},
            {"bufferView": 1, "componentType": 5126, "count": len(normal_data), "type": "VEC3"},
            {"bufferView": 2, "componentType": 5125, "count": len(indices), "type": "SCALAR", "min": [int(indices.min())], "max": [int(indices.max())]},
        ],
    }
    json_data = align4(json.dumps(document, separators=(",", ":")).encode("utf-8"), b" ")
    total_length = 12 + 8 + len(json_data) + 8 + len(binary)
    return b"".join((
        struct.pack("<4sII", b"glTF", 2, total_length),
        struct.pack("<II", len(json_data), 0x4E4F534A), json_data,
        struct.pack("<II", len(binary), 0x004E4942), binary,
    ))


def mask_to_polydata(mask: np.ndarray, affine: np.ndarray) -> vtk.vtkPolyData:
    vertices, faces, _, _ = measure.marching_cubes(mask.astype(np.uint8), level=0.5)
    world_vertices = (affine @ np.c_[vertices, np.ones(len(vertices))].T).T[:, :3]
    points = vtk.vtkPoints()
    points.SetData(numpy_to_vtk(world_vertices.astype(np.float32), deep=True))
    triangles = vtk.vtkCellArray()
    for face in faces.astype(np.int64):
        triangles.InsertNextCell(3)
        triangles.InsertCellPoint(int(face[0]))
        triangles.InsertCellPoint(int(face[1]))
        triangles.InsertCellPoint(int(face[2]))
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)
    polydata.SetPolys(triangles)
    return polydata


def simplify(polydata: vtk.vtkPolyData, reduction: float) -> vtk.vtkPolyData:
    if reduction == 0:
        return polydata
    decimator = vtk.vtkQuadricDecimation()
    decimator.SetInputData(polydata)
    decimator.SetTargetReduction(reduction)
    decimator.Update()
    return decimator.GetOutput()


def smooth(polydata: vtk.vtkPolyData, iterations: int = 16, passband: float = 0.12) -> vtk.vtkPolyData:
    """Relax the stair-stepping left by marching cubes over the voxel grid."""
    smoother = vtk.vtkWindowedSincPolyDataFilter()
    smoother.SetInputData(polydata)
    smoother.SetNumberOfIterations(iterations)
    smoother.SetPassBand(passband)
    smoother.BoundarySmoothingOff()
    smoother.FeatureEdgeSmoothingOff()
    smoother.NonManifoldSmoothingOn()
    smoother.NormalizeCoordinatesOn()
    smoother.Update()
    return smoother.GetOutput()


def polydata_arrays(polydata: vtk.vtkPolyData) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    normal_filter = vtk.vtkPolyDataNormals()
    normal_filter.SetInputData(polydata)
    normal_filter.ConsistencyOn()
    normal_filter.AutoOrientNormalsOn()
    normal_filter.SplittingOff()
    normal_filter.ComputePointNormalsOn()
    normal_filter.Update()
    output = normal_filter.GetOutput()
    vertices = vtk_to_numpy(output.GetPoints().GetData()).astype(np.float32)
    normals = vtk_to_numpy(output.GetPointData().GetNormals()).astype(np.float32)
    faces: list[tuple[int, int, int]] = []
    cell = vtk.vtkIdList()
    polys = output.GetPolys()
    polys.InitTraversal()
    while polys.GetNextCell(cell):
        if cell.GetNumberOfIds() == 3:
            faces.append(tuple(int(cell.GetId(index)) for index in range(3)))
    return vertices, normals, np.asarray(faces, dtype=np.uint32)


def slug(value: str) -> str:
    return value.replace("_", "-")


def merge_statistics(mask_root: Path) -> dict:
    """Intensity comes from TotalSegmentator; volumes are recomputed from the masks.

    The task writes ``volume: 0`` for the airway classes even when the mask is
    not empty, so trusting it would make the viewer show 0.00ml for a visible
    structure. Voxel-count x voxel-volume is exact and matches TotalSegmentator
    wherever the upstream value is correct.
    """
    merged: dict = {}
    for statistics_path in sorted(mask_root.glob("*/statistics.json")):
        try:
            merged.update(json.loads(statistics_path.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            continue
    return merged


def convert_case(mask_root: Path, output_root: Path, case_id: str) -> dict:
    output_root.mkdir(parents=True, exist_ok=True)
    upstream = merge_statistics(mask_root)
    layers = []
    volumes: dict = {}
    skipped: list[str] = []
    for task_dir, mask_name, display_name, color, opacity, optional in LAYER_DEFINITIONS:
        input_path = mask_root / task_dir / f"{mask_name}.nii.gz"
        if not input_path.exists():
            if optional:
                skipped.append(mask_name)
                continue
            raise FileNotFoundError(f"Missing TotalSegmentator mask: {input_path}")
        image = nib.load(str(input_path))
        mask = np.asanyarray(image.dataobj) > 0
        if not mask.any():
            if optional:
                skipped.append(mask_name)
                continue
            raise RuntimeError(f"Mask contains no foreground voxels: {input_path}")
        voxel_volume = float(np.prod(image.header.get_zooms()[:3]))
        volumes[mask_name] = {
            "volume": float(np.count_nonzero(mask)) * voxel_volume,
            "intensity": float(upstream.get(mask_name, {}).get("intensity", 0.0)),
        }
        base_polydata = smooth(mask_to_polydata(mask, image.affine))
        files: dict[str, str] = {}
        for quality, reduction in QUALITY_REDUCTIONS.items():
            mesh = simplify(base_polydata, reduction)
            vertices, normals, faces = polydata_arrays(mesh)
            if len(vertices) == 0 or len(faces) == 0:
                raise RuntimeError(f"Mesh conversion produced no geometry for {mask_name} ({quality})")
            filename = f"{slug(mask_name)}.{quality}.glb"
            (output_root / filename).write_bytes(make_glb(vertices, normals, faces))
            files[quality] = filename
        layers.append({
            "id": slug(mask_name),
            "name": display_name,
            "color": color,
            "opacity": opacity,
            "visible": True,
            "assets": files,
        })
    manifest = {
        "schemaVersion": 1,
        "dataset": "MSD Task06 Lung",
        "caseId": case_id,
        "unit": "mm",
        "coordinateSystem": "RAS",
        "layers": layers,
    }
    (output_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if volumes:
        (output_root / "statistics.json").write_text(json.dumps(volumes, indent=2) + "\n", encoding="utf-8")
    if skipped:
        print(json.dumps({"skippedOptionalMasks": skipped}))
    return manifest


def write_public_manifest(manifest: dict, path: Path, asset_base_url: str) -> None:
    base = asset_base_url.rstrip("/")
    public_manifest = json.loads(json.dumps(manifest))
    for layer in public_manifest["layers"]:
        layer["assets"] = {
            quality: f"{base}/{filename}"
            for quality, filename in layer["assets"].items()
        }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(public_manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mask-root", type=Path, help="Case segmentation root containing per-task sub-directories.")
    parser.add_argument("--mask-dir", type=Path, help="Deprecated: lung-lobe directory; equivalent to --mask-root <dir>/..")
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--public-manifest", type=Path)
    parser.add_argument("--asset-base-url")
    args = parser.parse_args()
    mask_root = args.mask_root
    if mask_root is None:
        if args.mask_dir is None:
            parser.error("--mask-root is required (or the deprecated --mask-dir)")
        mask_root = args.mask_dir.parent
    manifest = convert_case(mask_root, args.output_root, args.case_id)
    if args.public_manifest:
        if not args.asset_base_url:
            parser.error("--asset-base-url is required with --public-manifest")
        write_public_manifest(manifest, args.public_manifest, args.asset_base_url)
    print(json.dumps({"caseId": args.case_id, "layers": len(manifest["layers"]), "output": str(args.output_root)}))


if __name__ == "__main__":
    main()
