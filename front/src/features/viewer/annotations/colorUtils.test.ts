import { describe, expect, test } from 'vitest'
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv } from './colorUtils'

describe('color conversion', () => {
  test('normalizes six-digit HEX values and rejects invalid values', () => {
    expect(normalizeHex(' ff00AA ')).toBe('#ff00aa')
    expect(normalizeHex('#123456')).toBe('#123456')
    expect(normalizeHex('#12ab')).toBeNull()
    expect(normalizeHex('gggggg')).toBeNull()
  })

  test('converts HEX and RGB in both directions', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#ff8000')
  })

  test('round-trips a hue, saturation and value color', () => {
    const hsv = rgbToHsv({ r: 25, g: 100, b: 200 })
    expect(hsvToRgb(hsv)).toEqual({ r: 25, g: 100, b: 200 })
  })

  test('clamps RGB channel values before encoding', () => {
    expect(rgbToHex({ r: -1, g: 260, b: 12.6 })).toBe('#00ff0d')
  })
})
