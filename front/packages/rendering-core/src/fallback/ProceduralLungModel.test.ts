import { expect, test } from 'vitest'
import { Group, Mesh } from 'three'
import { createProceduralLungModel } from './ProceduralLungModel'

test('creates a visible grouped lung model for the no-asset state', () => {
  const model = createProceduralLungModel()
  const meshes: Mesh[] = []
  const names: string[] = []

  model.traverse(object => {
    names.push(object.name)
    if (object instanceof Mesh) meshes.push(object)
  })

  expect(model).toBeInstanceOf(Group)
  expect(model.name).toBe('procedural-lung-model')
  expect(meshes.length).toBeGreaterThanOrEqual(3)
  expect(meshes.every(mesh => mesh.visible)).toBe(true)
  expect(names).toEqual(expect.arrayContaining(['left-lung', 'right-lung', 'trachea']))
})
