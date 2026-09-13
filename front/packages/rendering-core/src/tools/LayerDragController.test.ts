import { expect, test, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three'
import { LayerDragController } from './LayerDragController'

test('drags only the hit layer in screen space and records one completed move', () => {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 } as DOMRect)
  canvas.setPointerCapture = vi.fn(); canvas.releasePointerCapture = vi.fn(); canvas.hasPointerCapture = () => true
  const root = new Group()
  root.rotation.z = Math.PI / 2
  const layer = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial()); layer.name = 'lobe'
  const other = layer.clone(); other.position.x = 5
  root.add(layer, other)
  const camera = new PerspectiveCamera(50, 1, .1, 100); camera.position.z = 10; camera.updateProjectionMatrix()
  const controls = vi.fn(); const completed = vi.fn()
  const drag = new LayerDragController(canvas, camera, root, () => [layer, other], controls, () => false, completed)
  const pointer = (type: string, x: number) => { const e = new MouseEvent(type, { clientX: x, clientY: 100, button: 0 }); Object.defineProperty(e, 'pointerId', { value: 1 }); canvas.dispatchEvent(e) }
  pointer('pointerdown', 100); pointer('pointermove', 140); pointer('pointerup', 140)
  expect(layer.position.y).toBeLessThan(-1)
  expect(Math.abs(layer.position.x)).toBeLessThan(.00001)
  expect(other.position.x).toBe(5)
  expect(completed).toHaveBeenCalledTimes(1)
  expect(controls.mock.calls.map(call => call[0])).toEqual([false, true])
  drag.dispose()
})
