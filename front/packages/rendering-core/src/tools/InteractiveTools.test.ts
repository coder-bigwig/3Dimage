import { expect, test, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three'
import { InteractiveTools } from './InteractiveTools'

function fixture({ clipped = () => false }: { clipped?: (point: import('three').Vector3) => boolean } = {}) {
  const canvas = document.createElement('canvas')
  document.body.append(canvas)
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 } as DOMRect)
  const root = new Group(), layer = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial())
  layer.name = 'lobe'; root.add(layer)
  const camera = new PerspectiveCamera(50, 1, .1, 100); camera.position.z = 10
  const tools = new InteractiveTools(canvas, camera, root, () => [layer], () => {}, clipped)
  tools.activate('annotation'); tools.text = '触摸标注'
  const pointer = (type: string, timestamp: number, pointerType = 'touch') => {
    const event = new MouseEvent(type, { clientX: 100, clientY: 100, button: 0 })
    Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: 1 }, timeStamp: { value: timestamp } })
    canvas.dispatchEvent(event)
  }
  const pointerAt = (type: string, x: number, y: number, pointerType = 'mouse') => {
    const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0 })
    Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: 1 }, timeStamp: { value: 0 } })
    canvas.dispatchEvent(event)
  }
  return { tools, canvas, pointer, pointerAt, dispose: () => { tools.dispose(); layer.geometry.dispose(); layer.material.dispose(); canvas.remove() } }
}

test('recognizes a real double tap even when rendering delays event processing', () => {
  const f = fixture()
  vi.spyOn(performance, 'now').mockReturnValue(1000)
  f.pointer('pointerdown', 100); f.pointer('pointerup', 150)
  expect(f.tools.records.items).toHaveLength(0)
  vi.mocked(performance.now).mockReturnValue(2200)
  f.pointer('pointerdown', 250); f.pointer('pointerup', 300)
  expect(f.tools.records.items).toHaveLength(1)
  expect(f.tools.records.items[0].label).toBe('触摸标注')
  f.dispose()
})

test('two slow single taps do not create a mark even if processed together', () => {
  const f = fixture()
  vi.spyOn(performance, 'now').mockReturnValue(1000)
  f.pointer('pointerdown', 100); f.pointer('pointerup', 150)
  f.pointer('pointerdown', 1250); f.pointer('pointerup', 1300)
  expect(f.tools.records.items).toHaveLength(0)
  f.dispose()
})

test('a cancelled touch cannot pair with a later tap', () => {
  const f = fixture()
  f.pointer('pointerdown', 100); f.pointer('pointerup', 150)
  f.pointer('pointercancel', 170)
  f.pointer('pointerdown', 250); f.pointer('pointerup', 300)
  expect(f.tools.records.items).toHaveLength(0)
  f.dispose()
})

test('a synthesized mouse double-click does not duplicate the touch mark', () => {
  const f = fixture()
  f.pointer('pointerdown', 100); f.pointer('pointerup', 150)
  f.pointer('pointerdown', 250); f.pointer('pointerup', 300)
  f.pointer('dblclick', 2000, 'mouse')
  expect(f.tools.records.items).toHaveLength(1)
  f.dispose()
})

test('switching back to a real mouse still permits a new double-click mark', () => {
  const f = fixture()
  f.pointer('pointerdown', 100); f.pointer('pointerup', 150)
  f.pointer('pointerdown', 250); f.pointer('pointerup', 300)
  f.pointer('pointerdown', 400, 'mouse'); f.pointer('pointerup', 450, 'mouse')
  f.pointer('dblclick', 600, 'mouse')
  expect(f.tools.records.items).toHaveLength(2)
  f.dispose()
})

test('two model clicks create a visible length record', () => {
  const f = fixture()
  f.tools.activate('length')
  f.pointerAt('pointerdown', 92, 100)
  f.pointerAt('pointerup', 92, 100)
  f.pointerAt('pointerdown', 108, 100)
  f.pointerAt('pointerup', 108, 100)

  expect(f.tools.records.items).toHaveLength(1)
  expect(f.tools.records.items[0].tool).toBe('length')
  expect(f.tools.records.items[0].label).toMatch(/mm$/)
  expect(f.tools.overlay.children.length).toBeGreaterThanOrEqual(3)
  expect(f.canvas.parentElement?.querySelector('.model-measurement-label')).toHaveTextContent(f.tools.records.items[0].label)
  f.dispose()
})

test('background, hidden, and clipped hits do not create a measurement point', () => {
  const f = fixture({ clipped: () => true })
  f.tools.activate('diameter')
  f.pointerAt('pointerdown', 5, 5)
  f.pointerAt('pointerup', 5, 5)
  expect(f.tools.records.pending).toHaveLength(0)
  f.dispose()
})
