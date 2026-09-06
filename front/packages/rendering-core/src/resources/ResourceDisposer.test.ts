import { BoxGeometry, DataTexture, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { expect, test, vi } from 'vitest'
import { ResourceDisposer } from './ResourceDisposer'

test('disposes shared geometry, material and texture exactly once', () => {
  const root = new Object3D()
  const geometry = new BoxGeometry()
  const texture = new DataTexture()
  const material = new MeshStandardMaterial({ map: texture })
  const geometrySpy = vi.spyOn(geometry, 'dispose')
  const textureSpy = vi.spyOn(texture, 'dispose')
  const materialSpy = vi.spyOn(material, 'dispose')
  root.add(new Mesh(geometry, material), new Mesh(geometry, material))

  new ResourceDisposer().disposeObject(root)

  expect(geometrySpy).toHaveBeenCalledOnce()
  expect(textureSpy).toHaveBeenCalledOnce()
  expect(materialSpy).toHaveBeenCalledOnce()
})
