import { afterEach, expect, test, vi } from 'vitest'
import { ToolRecords } from './ToolRecords'

const point = (x: number, y: number, z = 0) => ({ layerId: 'lung', position: [x, y, z] as [number, number, number] })

afterEach(() => { vi.unstubAllGlobals() })

test('two picked model points produce a millimetre measurement and undo restores it', () => {
  const records = new ToolRecords()
  records.add('length', point(0, 0))
  records.add('length', point(3, 4))
  expect(records.items[0].label).toBe('5.00 mm')
  records.clear('length')
  expect(records.items).toHaveLength(0)
  records.undo()
  expect(records.items[0].label).toBe('5.00 mm')
})

test('diameter commits a two-point record with a millimetre label', () => {
  const records = new ToolRecords()
  records.add('diameter', point(-2, 0))
  records.add('diameter', point(2, 0))
  expect(records.items).toHaveLength(1)
  expect(records.items[0]).toMatchObject({ tool: 'diameter', label: '4.00 mm' })
})

test('commits a measurement without secure-context randomUUID support', () => {
  vi.stubGlobal('crypto', { getRandomValues: (values: Uint8Array) => values.fill(7) })
  const records = new ToolRecords()

  records.add('length', point(0, 0))
  records.add('length', point(3, 4))

  expect(records.items[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('angle commits three points with a degree label', () => {
  const records = new ToolRecords()
  records.add('angle', point(-1, 0))
  records.add('angle', point(0, 0))
  records.add('angle', point(0, 1))
  expect(records.items).toHaveLength(1)
  expect(records.items[0]).toMatchObject({ tool: 'angle', label: '90.00°' })
})

test('clearing a measurement tool leaves other measurement types and annotations intact', () => {
  const records = new ToolRecords()
  records.add('length', point(0, 0))
  records.add('length', point(3, 4))
  records.add('diameter', point(0, 0))
  records.add('diameter', point(2, 0))
  records.add('annotation', point(1, 1), '保留')

  records.clear('length')

  expect(records.items.map(item => item.tool)).toEqual(['diameter', 'annotation'])
  records.undo()
  expect(records.items.map(item => item.tool)).toEqual(['length', 'diameter', 'annotation'])
})

test('clearing measurements removes every measurement but preserves annotations', () => {
  const records = new ToolRecords()
  records.add('length', point(0, 0))
  records.add('length', point(3, 4))
  records.add('angle', point(-1, 0))
  records.add('angle', point(0, 0))
  records.add('angle', point(0, 1))
  records.add('annotation', point(1, 1), '保留')

  records.clearMeasurements()

  expect(records.items.map(item => item.tool)).toEqual(['annotation'])
  records.undo()
  expect(records.items.map(item => item.tool)).toEqual(['length', 'angle', 'annotation'])
})

test('area remains pending until explicitly closed and rejects fewer than three vertices', () => {
  const records = new ToolRecords()
  records.add('closedArea', point(0, 0))
  records.add('closedArea', point(2, 0))
  expect(() => records.finishArea()).toThrow()
  records.add('closedArea', point(2, 2))
  records.add('closedArea', point(0, 2))
  records.finishArea()
  expect(records.items[0].label).toBe('4.00 mm²')
})

test('annotations require text and undo cancels a pending picked point first', () => {
  const records = new ToolRecords()
  expect(() => records.add('annotation', point(1, 2), ' ')).toThrow()
  records.add('annotation', point(1, 2), '结节')
  records.add('length', point(1, 2))
  records.undo()
  expect(records.pending).toHaveLength(0)
  expect(records.items[0].label).toBe('结节')
})
