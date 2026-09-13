/** Colour lookup tables, mirroring the reference viewer's Lut menu. */

export type CtLutName = 'plain' | 'invPlain' | 'rainbow' | 'hot' | 'hot_iron' | 'pet' | 'hot_metal_blue' | 'pet_20step'

export const ctLutNames: readonly CtLutName[] = ['plain', 'invPlain', 'rainbow', 'hot', 'hot_iron', 'pet', 'hot_metal_blue', 'pet_20step'] as const

type Stop = [number, number, number, number]
type Ramp = readonly Stop[]

const RAMPS: Record<Exclude<CtLutName, 'pet_20step'>, Ramp> = {
  plain: [[0, 0, 0, 0], [1, 255, 255, 255]],
  invPlain: [[0, 255, 255, 255], [1, 0, 0, 0]],
  rainbow: [
    [0, 0, 0, 128], [0.25, 0, 176, 255], [0.5, 0, 220, 88], [0.75, 255, 220, 0], [1, 255, 32, 32],
  ],
  hot: [[0, 0, 0, 0], [0.34, 226, 0, 0], [0.67, 255, 226, 0], [1, 255, 255, 255]],
  hot_iron: [
    [0, 0, 0, 0], [0.22, 122, 0, 0], [0.5, 255, 84, 0], [0.78, 255, 200, 40], [1, 255, 255, 226],
  ],
  pet: [
    [0, 0, 0, 0], [0.18, 40, 40, 90], [0.38, 0, 128, 220], [0.58, 0, 208, 128], [0.78, 255, 208, 0], [0.92, 255, 64, 0], [1, 255, 255, 255],
  ],
  hot_metal_blue: [
    [0, 0, 0, 0], [0.28, 226, 0, 0], [0.52, 255, 176, 0], [0.74, 255, 255, 128], [0.88, 220, 240, 255], [1, 0, 96, 255],
  ],
}

function interpolate(ramp: Ramp, position: number): [number, number, number] {
  const clamped = Math.min(Math.max(position, 0), 1)
  for (let index = 1; index < ramp.length; index += 1) {
    const [endAt, red, green, blue] = ramp[index]
    if (clamped <= endAt) {
      const [startAt, startRed, startGreen, startBlue] = ramp[index - 1]
      const span = endAt - startAt || 1
      const ratio = (clamped - startAt) / span
      return [
        Math.round(startRed + (red - startRed) * ratio),
        Math.round(startGreen + (green - startGreen) * ratio),
        Math.round(startBlue + (blue - startBlue) * ratio),
      ]
    }
  }
  const last = ramp[ramp.length - 1]
  return [last[1], last[2], last[3]]
}

const cache = new Map<CtLutName, Uint8Array>()

/** 256 x RGB table for a lookup name. */
export function lutTable(name: CtLutName): Uint8Array {
  const cached = cache.get(name)
  if (cached) return cached
  const table = new Uint8Array(256 * 3)
  const source = name === 'pet_20step' ? RAMPS.pet : RAMPS[name]
  const steps = name === 'pet_20step' ? 20 : 0
  for (let level = 0; level < 256; level += 1) {
    const position = steps > 0 ? Math.floor((level / 256) * steps) / (steps - 1) : level / 255
    const [red, green, blue] = interpolate(source, position)
    table[level * 3] = red
    table[level * 3 + 1] = green
    table[level * 3 + 2] = blue
  }
  cache.set(name, table)
  return table
}

/** Expand 8-bit grey into RGBA using the lookup table. */
export function applyLut(gray: Uint8ClampedArray, name: CtLutName, out: Uint8ClampedArray): Uint8ClampedArray {
  const table = lutTable(name)
  if (out.length !== gray.length * 4) throw new Error('RGBA 缓冲长度应为灰度缓冲的四倍')
  for (let index = 0; index < gray.length; index += 1) {
    const level = gray[index] * 3
    const target = index * 4
    out[target] = table[level]
    out[target + 1] = table[level + 1]
    out[target + 2] = table[level + 2]
    out[target + 3] = 255
  }
  return out
}

export function lutPreviewGradient(name: CtLutName): string {
  const table = lutTable(name)
  const stops: string[] = []
  for (let level = 0; level <= 255; level += 32) {
    const offset = level * 3
    stops.push(`rgb(${table[offset]} ${table[offset + 1]} ${table[offset + 2]}) ${Math.round((level / 255) * 100)}%`)
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
