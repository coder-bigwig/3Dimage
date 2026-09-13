/** Multi-planar slice extraction in display orientation. */

import type { CtVolume } from './ctVolume'

export type CtOrientation = 'axial' | 'coronal' | 'sagittal'

export const ctOrientationLabels: Record<CtOrientation, string> = {
  axial: '横断面',
  coronal: '冠状面',
  sagittal: '矢状面',
}

export interface CtSlicePlane {
  orientation: CtOrientation
  /** Number of slices available along this orientation's axis. */
  count: number
  rows: number
  columns: number
  /** Millimetres per screen pixel, so MPR can be shown with equal aspect. */
  rowSpacing: number
  columnSpacing: number
}

export function slicePlane(volume: CtVolume, orientation: CtOrientation): CtSlicePlane {
  const [x, y, z] = volume.spacing
  if (orientation === 'axial') {
    return { orientation, count: volume.depth, rows: volume.height, columns: volume.width, rowSpacing: y, columnSpacing: x }
  }
  if (orientation === 'coronal') {
    return { orientation, count: volume.height, rows: volume.depth, columns: volume.width, rowSpacing: z, columnSpacing: x }
  }
  return { orientation, count: volume.width, rows: volume.depth, columns: volume.height, rowSpacing: z, columnSpacing: y }
}

export function clampSliceIndex(plane: CtSlicePlane, index: number): number {
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.round(index), 0), plane.count - 1)
}

/**
 * Copy one slice into `out`, already flipped into the reading orientation:
 * - axial: anterior at the top, patient right on the viewer's left
 * - coronal: superior at the top, patient right on the viewer's left
 * - sagittal: superior at the top, anterior on the viewer's left
 */
export function readSlice(volume: CtVolume, orientation: CtOrientation, index: number, out: Int16Array): Int16Array {
  const plane = slicePlane(volume, orientation)
  const { width, height, depth, data } = volume
  const slice = clampSliceIndex(plane, index)
  const { rows, columns } = plane
  if (out.length !== rows * columns) throw new Error(`切片缓冲长度应为 ${rows * columns}`)

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let source: number
      if (orientation === 'axial') {
        source = slice * height * width + (height - 1 - row) * width + (width - 1 - column)
      } else if (orientation === 'coronal') {
        source = (depth - 1 - row) * height * width + slice * width + (width - 1 - column)
      } else {
        source = (depth - 1 - row) * height * width + (height - 1 - column) * width + slice
      }
      out[row * columns + column] = data[source]
    }
  }
  return out
}
