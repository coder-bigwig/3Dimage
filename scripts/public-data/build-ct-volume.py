"""Convert a CT volume (NIfTI) into a browser-friendly int16 buffer.

The reference viewer renders real DICOM through DWV; this project's public
dataset path only ships an MSD NIfTI, so we emit an equivalent minimal volume
asset: reoriented to RAS, block-averaged to a web-manageable size, stored as
little-endian int16 plus a JSON descriptor carrying spacing, HU range, the
default window and non-identifying metadata.

Local-data tooling: writes only under the caller-provided output root.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import nibabel as nib
import numpy as np

# Window presets mirror the reference viewer's 宽位 menu (W, C) in Hounsfield units.
WINDOW_PRESETS = (
    {"key": "bone", "label": "骨窗", "center": 500, "width": 2000},
    {"key": "lung", "label": "肺窗", "center": -600, "width": 1600},
    {"key": "abdomen", "label": "腹窗", "center": 40, "width": 400},
    {"key": "brain", "label": "脑窗", "center": 30, "width": 70},
    {"key": "soft", "label": "软组织窗", "center": 50, "width": 350},
    {"key": "liver", "label": "肝窗", "center": 60, "width": 160},
    {"key": "mediastinum", "label": "纵膈窗", "center": 50, "width": 500},
    {"key": "stroke", "label": "卒中窗", "center": 30, "width": 30},
    {"key": "cta", "label": "CTA窗", "center": 170, "width": 600},
)
DEFAULT_PRESET = "lung"


def to_ras(data: np.ndarray, affine: np.ndarray) -> np.ndarray:
    """Flip axes whose affine diagonal points negative, giving an RAS volume."""
    for axis in range(3):
        if affine[axis, axis] < 0:
            data = np.flip(data, axis=axis)
    return data


def block_mean(data: np.ndarray, factors: tuple[int, int, int]) -> np.ndarray:
    """Average whole blocks so the sampling stays aligned and memory stays bounded."""
    for axis, factor in enumerate(factors):
        if factor > 1:
            count = data.shape[axis] // factor * factor
            trimmed = data.take(np.arange(count), axis=axis)
            shape = list(trimmed.shape)
            shape[axis:axis + 1] = [count // factor, factor]
            data = trimmed.reshape(shape).mean(axis=axis + 1)
    return data


def build(input_path: Path, output_root: Path, case_id: str, inplane_factor: int, slice_factor: int) -> dict:
    image = nib.load(str(input_path))
    spacing = [abs(float(value)) for value in image.header.get_zooms()[:3]]
    if nib.aff2axcodes(image.affine) != ("R", "A", "S"):
        data = to_ras(np.asanyarray(image.dataobj, dtype=np.float32), image.affine)
    else:
        data = np.asanyarray(image.dataobj, dtype=np.float32)

    data = block_mean(data, (inplane_factor, inplane_factor, slice_factor))
    spacing = [spacing[0] * inplane_factor, spacing[1] * inplane_factor, spacing[2] * slice_factor]

    # Store z-major with x fastest so a slice is a contiguous (height, width) block.
    data = np.transpose(data, (2, 1, 0))
    clipped = np.clip(np.rint(data), -32768, 32767).astype("<i2")
    depth, height, width = clipped.shape

    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "volume.bin").write_bytes(clipped.tobytes(order="C"))

    preset = next(item for item in WINDOW_PRESETS if item["key"] == DEFAULT_PRESET)
    descriptor = {
        "schemaVersion": 1,
        "caseId": case_id,
        "dims": [width, height, depth],
        "spacing": [round(value, 6) for value in spacing],
        "dataType": "int16",
        "byteOrder": "little-endian",
        "indexOrder": "z-major, then y, then x",
        "dataFile": "volume.bin",
        "huRange": [int(clipped.min()), int(clipped.max())],
        "defaultWindow": {"center": preset["center"], "width": preset["width"]},
        "presets": [dict(item) for item in WINDOW_PRESETS],
        # Synthetic, non-identifying metadata: the public case has no patient fields
        # and the viewer must never invent them.
        "meta": {
            "caseId": case_id,
            "seriesName": "CT 胸部平扫（公开演示数据）",
            "sliceThicknessMm": round(spacing[2], 3),
            "studyDate": "",
            "studyTime": "",
            "note": "MSD Task06 Lung public case, downsampled for the browser. No patient identity.",
        },
    }
    (output_root / "ct-volume.json").write_text(json.dumps(descriptor, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return descriptor


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True, help="Source CT NIfTI (.nii/.nii.gz).")
    parser.add_argument("--output-root", type=Path, required=True, help="Directory receiving volume.bin + ct-volume.json.")
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--inplane-factor", type=int, default=2)
    parser.add_argument("--slice-factor", type=int, default=2)
    args = parser.parse_args()
    descriptor = build(args.input, args.output_root, args.case_id, args.inplane_factor, args.slice_factor)
    size_bytes = (args.output_root / "volume.bin").stat().st_size
    print(json.dumps({
        "caseId": args.case_id,
        "dims": descriptor["dims"],
        "spacing": descriptor["spacing"],
        "megabytes": round(size_bytes / 1024 / 1024, 1),
    }))


if __name__ == "__main__":
    main()
