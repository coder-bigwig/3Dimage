import { expect, test } from 'vitest'
import { ToolRecords } from './ToolRecords'

const point = (x: number, y: number, z = 0) => ({ layerId: 'lung', position: [x, y, z] as [number, number, number] })

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
