import { expect, test } from 'vitest'
import { ToolRecords } from '../../../../packages/rendering-core/src/tools/ToolRecords'

test('editing and moving a label retains its model anchor and supports undo', () => {
  const records = new ToolRecords()
  records.add('annotation', { layerId: 'layer', position: [1, 2, 3] }, '原标注')
  const id = records.items[0].id
  records.editAnnotation(id, '修改后', [60, -40])
  expect(records.items[0]).toMatchObject({ label: '修改后', labelOffset: [60, -40], points: [{ position: [1, 2, 3] }] })
  records.undo()
  expect(records.items[0].label).toBe('原标注')
})

test('blank edits cannot destroy existing annotations', () => {
  const records = new ToolRecords()
  records.add('annotation', { layerId: 'layer', position: [1, 2, 3] }, '原标注')
  expect(() => records.editAnnotation(records.items[0].id, ' ')).toThrow()
  expect(records.items[0].label).toBe('原标注')
})
