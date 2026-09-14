export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsv {
  h: number
  s: number
  v: number
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim().replace(/^#/, '')
  return /^[0-9a-f]{6}$/i.test(trimmed) ? `#${trimmed.toLowerCase()}` : null
}

export function hexToRgb(value: string): Rgb | null {
  const normalized = normalizeHex(value)
  if (!normalized) return null
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

export function rgbToHex(value: Rgb): string {
  return `#${[value.r, value.g, value.b]
    .map(channel => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

export function rgbToHsv(value: Rgb): Hsv {
  const r = clampChannel(value.r) / 255
  const g = clampChannel(value.g) / 255
  const b = clampChannel(value.b) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
    if (h < 0) h += 360
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max }
}

export function hsvToRgb(value: Hsv): Rgb {
  const h = ((value.h % 360) + 360) % 360
  const s = Math.min(1, Math.max(0, value.s))
  const v = Math.min(1, Math.max(0, value.v))
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let red = 0
  let green = 0
  let blue = 0

  if (h < 60) [red, green, blue] = [c, x, 0]
  else if (h < 120) [red, green, blue] = [x, c, 0]
  else if (h < 180) [red, green, blue] = [0, c, x]
  else if (h < 240) [red, green, blue] = [0, x, c]
  else if (h < 300) [red, green, blue] = [x, 0, c]
  else [red, green, blue] = [c, 0, x]

  return {
    r: clampChannel((red + m) * 255),
    g: clampChannel((green + m) * 255),
    b: clampChannel((blue + m) * 255),
  }
}
