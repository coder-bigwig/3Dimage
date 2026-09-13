/** DICOM-style linear windowing. */

/** PS3.3 C.11.2.1.2 linear window function, mapped to 0..255. */
export function windowToGray(value: number, center: number, width: number): number {
  const safeWidth = Math.max(1, width)
  const lower = center - 0.5 - (safeWidth - 1) / 2
  const upper = center - 0.5 + (safeWidth - 1) / 2
  if (value <= lower) return 0
  if (value > upper) return 255
  return Math.round(((value - lower) / (upper - lower)) * 255)
}

export function renderSliceToGray(slice: Int16Array, center: number, width: number, out: Uint8ClampedArray): Uint8ClampedArray {
  if (out.length !== slice.length) throw new Error('灰度缓冲长度与切片不一致')
  for (let index = 0; index < slice.length; index += 1) out[index] = windowToGray(slice[index], center, width)
  return out
}
