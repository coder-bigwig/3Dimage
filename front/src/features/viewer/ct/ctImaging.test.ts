import { describe, expect, it, vi } from 'vitest'
import { loadCtVolume, resolveVolumeDataUrl, type CtVolume } from './ctVolume'
import { clampSliceIndex, readSlice, slicePlane } from './ctSlice'
import { applyWindowDrag, resolveWindowOption, ctWindowOptions } from './ctPresets'
import { applyLut, lutTable } from './ctLut'
import { angleDegrees, computeCellTransform, distanceMm, formatLength, formatMeasure, measureValue, polygonAreaMm2, screenToSlice, sliceToScreen } from './ctMeasure'
import { renderSliceToGray, windowToGray } from './ctWindow'

function makeVolume(): CtVolume {
  // width 3, height 2, depth 2 — index = k * height * width + j * width + i
  return {
    descriptor: {
      schemaVersion: 1, caseId: 'demo', dims: [3, 2, 2], spacing: [1, 2, 3], dataType: 'int16',
      byteOrder: 'little-endian', dataFile: 'volume.bin', huRange: [0, 11],
      defaultWindow: { center: 5, width: 10 },
    },
    width: 3, height: 2, depth: 2, spacing: [1, 2, 3],
    data: Int16Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
  }
}

describe('windowToGray', () => {
  it('clamps below and above the window', () => {
    expect(windowToGray(-500, 40, 400)).toBe(0)
    expect(windowToGray(2000, 40, 400)).toBe(255)
  })

  it('maps the window centre to mid grey', () => {
    expect(windowToGray(40, 40, 400)).toBe(128)
  })
})

describe('renderSliceToGray', () => {
  it('produces one byte per voxel', () => {
    const out = renderSliceToGray(Int16Array.from([-1000, 0, 1000]), 0, 1000, new Uint8ClampedArray(3))
    expect([...out]).toEqual([0, 128, 255])
  })
})

describe('slicePlane', () => {
  it('describes each orientation with its own spacing', () => {
    const volume = makeVolume()
    expect(slicePlane(volume, 'axial')).toMatchObject({ count: 2, rows: 2, columns: 3, rowSpacing: 2, columnSpacing: 1 })
    expect(slicePlane(volume, 'coronal')).toMatchObject({ count: 2, rows: 2, columns: 3, rowSpacing: 3, columnSpacing: 1 })
    expect(slicePlane(volume, 'sagittal')).toMatchObject({ count: 3, rows: 2, columns: 2, rowSpacing: 3, columnSpacing: 2 })
  })

  it('clamps the requested index', () => {
    const plane = slicePlane(makeVolume(), 'sagittal')
    expect(clampSliceIndex(plane, -4)).toBe(0)
    expect(clampSliceIndex(plane, 99)).toBe(2)
  })
})

describe('readSlice', () => {
  it('reads axial slices anterior-first with patient right on the viewer left', () => {
    const slice = readSlice(makeVolume(), 'axial', 0, new Int16Array(6))
    expect([...slice]).toEqual([5, 4, 3, 2, 1, 0])
  })

  it('reads coronal slices superior-first', () => {
    const slice = readSlice(makeVolume(), 'coronal', 0, new Int16Array(6))
    expect([...slice]).toEqual([8, 7, 6, 2, 1, 0])
  })

  it('reads sagittal slices superior-first with anterior on the viewer left', () => {
    const slice = readSlice(makeVolume(), 'sagittal', 0, new Int16Array(4))
    expect([...slice]).toEqual([9, 6, 3, 0])
  })

  it('rejects a mismatched output buffer', () => {
    expect(() => readSlice(makeVolume(), 'axial', 0, new Int16Array(5))).toThrow('切片缓冲长度')
  })
})

describe('window presets', () => {
  it('mirrors the reference menu and restores the default on reset', () => {
    expect(ctWindowOptions.map(option => option.label)).toEqual([
      '重置窗宽窗位', '骨窗', '肺窗', '腹窗', '脑窗', '软组织窗', '肝窗', '纵膈窗', '卒中窗', 'CTA窗',
    ])
    const lung = ctWindowOptions.find(option => option.key === 'lung')!
    expect(resolveWindowOption(lung, { center: 0, width: 1 })).toEqual({ center: -600, width: 1600 })
    const reset = ctWindowOptions.find(option => option.key === 'reset')!
    expect(resolveWindowOption(reset, { center: -600, width: 1600 })).toEqual({ center: -600, width: 1600 })
  })

  it('maps drag distance onto width and centre', () => {
    expect(applyWindowDrag({ center: 40, width: 400 }, 10, -5)).toEqual({ center: 30, width: 440 })
    expect(applyWindowDrag({ center: 40, width: 10 }, -10, 0).width).toBe(1)
  })
})

describe('lookup tables', () => {
  it('keeps plain monotonic and inverts invPlain', () => {
    const plain = lutTable('plain')
    expect(plain[0]).toBe(0)
    expect(plain[255 * 3]).toBe(255)
    const inverted = lutTable('invPlain')
    expect(inverted[0]).toBe(255)
    expect(inverted[255 * 3]).toBe(0)
  })

  it('quantises pet_20step into at most 20 distinct colours', () => {
    const table = lutTable('pet_20step')
    const seen = new Set<string>()
    for (let level = 0; level < 256; level += 1) seen.add(`${table[level * 3]},${table[level * 3 + 1]},${table[level * 3 + 2]}`)
    expect(seen.size).toBeLessThanOrEqual(20)
  })

  it('expands grey to opaque RGBA', () => {
    const out = applyLut(Uint8ClampedArray.from([0, 255]), 'plain', new Uint8ClampedArray(8))
    expect([...out]).toEqual([0, 0, 0, 255, 255, 255, 255, 255])
  })
})

describe('measurement geometry', () => {
  it('converts slice distance to millimetres using per-axis spacing', () => {
    expect(distanceMm(10, 20, 40, 60, 1, 1)).toBe(50)
    // 2 mm slices: the same pixel gap along v is twice as long
    expect(distanceMm(0, 0, 0, 10, 1, 2)).toBe(20)
    expect(formatLength(49.999)).toBe('50.00 mm')
  })

  it('fits anisotropic slices by physical extent', () => {
    // 400 x 200 canvas, 200 x 100 slice pixels, 1 mm columns and 2 mm rows.
    // Both axes span 200 mm, so the slice stays square: fit by height, leaving
    // 100 px on each side, and each slice row is drawn twice as tall as a column.
    const transform = computeCellTransform({
      canvasWidth: 400, canvasHeight: 200, columns: 200, rows: 100,
      columnSpacing: 1, rowSpacing: 2, zoom: 1, panX: 0, panY: 0,
    })
    expect(transform.scaleU).toBeCloseTo(1)
    expect(transform.scaleV).toBeCloseTo(2)
    expect(transform.dx).toBeCloseTo(100)
    expect(transform.dy).toBeCloseTo(0)
  })

  it('round-trips screen and slice coordinates', () => {
    const transform = computeCellTransform({
      canvasWidth: 300, canvasHeight: 300, columns: 150, rows: 300,
      columnSpacing: 1, rowSpacing: 0.5, zoom: 1, panX: 0, panY: 0,
    })
    const point = screenToSlice(transform, 120, 90)
    const back = sliceToScreen(transform, point.u, point.v)
    expect(back.x).toBeCloseTo(120)
    expect(back.y).toBeCloseTo(90)
  })

  it('centres the slice when the canvas aspect differs', () => {
    const transform = computeCellTransform({
      canvasWidth: 400, canvasHeight: 100, columns: 100, rows: 100,
      columnSpacing: 1, rowSpacing: 1, zoom: 1, panX: 0, panY: 0,
    })
    expect(transform.dx).toBeCloseTo(150) // (400 - 100) / 2
    expect(transform.dy).toBeCloseTo(0)
  })

  it('degrades to identity when the canvas has no size', () => {
    const transform = computeCellTransform({
      canvasWidth: 0, canvasHeight: 0, columns: 10, rows: 10,
      columnSpacing: 1, rowSpacing: 1, zoom: 1, panX: 0, panY: 0,
    })
    expect(screenToSlice(transform, 12, 34)).toEqual({ u: 12, v: 34 })
  })

  it('measures angles from the vertex point', () => {
    // vertex at origin, arms along +u and +v → 90°; a straight line → 180°
    expect(angleDegrees([{ u: 0, v: 0 }, { u: 20, v: 0 }, { u: 0, v: 20 }], 1, 1)).toBeCloseTo(90)
    expect(angleDegrees([{ u: 5, v: 5 }, { u: 0, v: 5 }, { u: 10, v: 5 }], 1, 1)).toBeCloseTo(180)
  })

  it('computes polygon area with the shoelace formula', () => {
    const square = [{ u: 0, v: 0 }, { u: 10, v: 0 }, { u: 10, v: 10 }, { u: 0, v: 10 }]
    expect(polygonAreaMm2(square, 1, 1)).toBeCloseTo(100)
    expect(polygonAreaMm2(square, 2, 2)).toBeCloseTo(400)
  })

  it('formats values per measurement kind', () => {
    expect(formatMeasure('length', 12.345)).toBe('12.35 mm')
    expect(formatMeasure('angle', 89.999)).toBe('90.0°')
    expect(formatMeasure('area', 150)).toBe('1.50 cm²')
    expect(formatMeasure('area', 42)).toBe('42.0 mm²')
    expect(measureValue('diameter', [{ u: 0, v: 0 }, { u: 30, v: 40 }], 1, 1)).toBe(50)
  })
})

describe('loadCtVolume', () => {
  it('loads the descriptor and the matching int16 payload', async () => {
    const descriptor = { schemaVersion: 1, caseId: 'demo', dims: [2, 1, 1], spacing: [1, 1, 1], dataType: 'int16', byteOrder: 'little-endian', dataFile: 'volume.bin', huRange: [0, 0], defaultWindow: { center: 0, width: 1 } }
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('ct-volume.json')
      ? new Response(JSON.stringify(descriptor), { status: 200 })
      : new Response(new Int16Array([7, -3]).buffer, { status: 200 }))

    const volume = await loadCtVolume('/public-data/ct-volume.json', undefined, fetcher)

    expect([volume.width, volume.height, volume.depth]).toEqual([2, 1, 1])
    expect([...volume.data]).toEqual([7, -3])
    expect(fetcher).toHaveBeenLastCalledWith('/public-data/volume.bin', { signal: undefined, credentials: 'omit' })
  })

  it('rejects a payload whose length disagrees with the descriptor', async () => {
    const descriptor = { schemaVersion: 1, caseId: 'demo', dims: [4, 4, 4], spacing: [1, 1, 1], dataType: 'int16', byteOrder: 'little-endian', dataFile: 'volume.bin', huRange: [0, 0], defaultWindow: { center: 0, width: 1 } }
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('ct-volume.json')
      ? new Response(JSON.stringify(descriptor), { status: 200 })
      : new Response(new Int16Array([1]).buffer, { status: 200 }))

    await expect(loadCtVolume('/x/ct-volume.json', undefined, fetcher)).rejects.toThrow('长度不符')
  })

  it('resolves the data file beside the descriptor', () => {
    expect(resolveVolumeDataUrl('/public-data/msd-lung/lung_001/ct-volume.json', 'volume.bin'))
      .toBe('/public-data/msd-lung/lung_001/volume.bin')
  })
})
