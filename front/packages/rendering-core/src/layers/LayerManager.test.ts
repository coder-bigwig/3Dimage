import { expect, test } from 'vitest'
import { LayerManager } from './LayerManager'
import { BoxGeometry, Mesh, MeshPhongMaterial } from 'three'

test('transparent layers do not occlude internal structures and restore depth writes when opaque', () => {
  const manager = new LayerManager()
  const material = new MeshPhongMaterial()
  manager.register('shell', new Mesh(new BoxGeometry(), material), '#17c4c5', 0.62)
  expect(material.depthWrite).toBe(false)
  manager.setOpacity('shell', 1)
  expect(material.depthWrite).toBe(true)
  manager.setOpacity('shell', 0)
  expect(material.depthWrite).toBe(false)
})

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
