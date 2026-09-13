import { expect, test } from 'vitest'
import { groupLayers } from './anatomyGroups'

test('maps only explicit lobe identifiers and keeps unknown layers in other', () => {
  const groups = groupLayers([
    { id: 'rs1', parentId: null, code: 'rs1', name: '任意名称', color: '#fff', opacity: 1, visible: true, volumeMl: null, sortOrder: 1, assets: {} },
    { id: 'lung-lower-lobe-left', parentId: null, code: 'public-id', name: '任意名称', color: '#fff', opacity: 1, visible: true, volumeMl: null, sortOrder: 2, assets: {} },
    { id: 'unknown', parentId: null, code: 'unknown', name: '右上', color: '#fff', opacity: 1, visible: true, volumeMl: null, sortOrder: 3, assets: {} },
  ])

  expect(groups.find(group => group.id === 'right-upper')?.layerIds).toEqual(['rs1'])
  expect(groups.find(group => group.id === 'left-lower')?.layerIds).toEqual(['lung-lower-lobe-left'])
  expect(groups.find(group => group.id === 'other')?.layerIds).toEqual(['unknown'])
})
