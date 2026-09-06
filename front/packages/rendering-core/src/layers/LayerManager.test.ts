import { expect, test } from 'vitest'
import { LayerManager } from './LayerManager'

test('isolates one layer and restores previous visibility', () => {
  const manager = new LayerManager(['airway', 'artery', 'vein'])
  manager.setVisible('vein', false)

  manager.isolate('artery')
  expect(manager.visibleIds()).toEqual(['artery'])

  manager.closeIsolation()
  expect(manager.visibleIds()).toEqual(['airway', 'artery'])
})

test('rejects operations for an unknown layer', () => {
  const manager = new LayerManager(['airway'])
  expect(() => manager.setOpacity('missing', 0.5)).toThrow('Unknown layer: missing')
})
