import { Group, MOUSE, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three'
import { beforeEach, afterEach, expect, test, vi } from 'vitest'

const orbitControlsState = vi.hoisted(() => ({ instance: null as null | {
  target: Vector3
  enableRotate?: boolean
  rotateSpeed?: number
  mouseButtons?: { LEFT?: number }
}, camera: null as PerspectiveCamera | null, scene: null as Scene | null }))

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    target = new Vector3()
    autoRotate = false
    enableDamping = false
    enableRotate = false
    rotateSpeed = 0
    mouseButtons: { LEFT?: number } = {}
    constructor(camera: PerspectiveCamera) {
      orbitControlsState.instance = this
      orbitControlsState.camera = camera
    }
    reset() {}
    update() {}
    dispose() {}
  },
}))

vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>()
  return {
    ...actual,
    WebGLRenderer: class {
      setPixelRatio() {}
      setSize() {}
      render(scene: Scene) { orbitControlsState.scene = scene }
      dispose() {}
    },
  }
})

import { ViewerEngine } from './ViewerEngine'
import { GlbLayerLoader } from './loaders/GlbLayerLoader'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

test.each(['RAS', 'LPS'] as const)('initial load and reset look at the anatomical front for %s assets', async coordinateSystem => {
  const { Mesh, BoxGeometry } = await import('three')
  vi.spyOn(GlbLayerLoader.prototype, 'load').mockResolvedValue(new Mesh(new BoxGeometry(200, 100, 250)))
  const engine = new ViewerEngine(document.createElement('canvas'))
  await engine.load({ unit: 'mm', coordinateSystem, layers: [{
    id: 'lung', name: 'Lung', color: '#e543d7', opacity: 0.72, visible: true,
    assets: { medium: '/lung.glb' },
  }] })
  const camera = orbitControlsState.camera!
  const controls = orbitControlsState.instance!
  expect(camera.up.toArray()).toEqual([0, 0, 1])
  const offset = camera.position.clone().sub(controls.target)
  expect(offset.x).toBeCloseTo(0)
  expect(offset.z).toBeCloseTo(0)
  expect(Math.sign(offset.y)).toBe(coordinateSystem === 'RAS' ? 1 : -1)
  const initial = camera.position.clone()
  engine.setView('top')
  engine.reset()
  expect(camera.position.toArray()).toEqual(initial.toArray())
  expect(camera.up.toArray()).toEqual([0, 0, 1])
  engine.dispose()
})

test('auto rotation follows screen-up from a tilted view and pauses without moving the camera', async () => {
  let frame: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1 })
  const engine = new ViewerEngine(document.createElement('canvas'))
  await engine.load({ unit: 'mm', layers: [] })
  const camera = orbitControlsState.camera!
  const target = orbitControlsState.instance!.target
  camera.position.copy(target).add(new Vector3(100, 170, 90))
  camera.lookAt(target)
  const cameraPosition = camera.position.clone()
  const cameraOrientation = camera.quaternion.clone()
  const screenUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  const root = orbitControlsState.scene!.children.find(object => object instanceof Group)!
  engine.setAutoRotate(true)
  frame(0)
  for (let t = 30; t <= 900; t += 30) frame(t)
  expect(root.quaternion.angleTo(new Quaternion().setFromAxisAngle(screenUp, Math.PI / 12))).toBeCloseTo(0)
  expect(camera.position.toArray()).toEqual(cameraPosition.toArray())
  expect(camera.quaternion.toArray()).toEqual(cameraOrientation.toArray())
  const paused = root.quaternion.clone()
  engine.setAutoRotate(false)
  frame(930)
  expect(root.quaternion.toArray()).toEqual(paused.toArray())
  engine.reset()
  expect(root.quaternion.toArray()).toEqual([0, 0, 0, 1])
  expect(root.position.toArray()).toEqual([0, 0, 0])
  engine.dispose()
})

test('maps horizontal left-button dragging to smooth orbit rotation', () => {
  const canvas = document.createElement('canvas')
  const engine = new ViewerEngine(canvas)

  expect(orbitControlsState.instance?.enableRotate).toBe(true)
  expect(orbitControlsState.instance?.mouseButtons?.LEFT).toBe(MOUSE.ROTATE)
  expect(orbitControlsState.instance?.rotateSpeed).toBeGreaterThan(0)
  engine.dispose()
})

test('uses the procedural model when no external layers are available', async () => {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'clientWidth', { value: 640 })
  Object.defineProperty(canvas, 'clientHeight', { value: 480 })
  const engine = new ViewerEngine(canvas)

  await engine.load({ unit: 'mm', layers: [] })

  expect(engine.hasFallbackModel()).toBe(true)
  expect(() => engine.reset()).not.toThrow()
  engine.dispose()
})

test('initial load and reset restore the centered upright front view', async () => {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'clientWidth', { value: 640 })
  Object.defineProperty(canvas, 'clientHeight', { value: 480 })
  const engine = new ViewerEngine(canvas)

  await engine.load({ unit: 'mm', layers: [] })
  const camera = orbitControlsState.camera
  const controls = orbitControlsState.instance
  expect(camera).not.toBeNull()
  expect(controls).not.toBeNull()
  if (!camera || !controls) throw new Error('Viewer camera was not initialized')

  expect(camera.position.x).toBeCloseTo(controls.target.x)
  expect(camera.position.y).toBeCloseTo(controls.target.y)
  expect(camera.position.z).toBeGreaterThan(controls.target.z)
  expect(camera.up.toArray()).toEqual([0, 1, 0])
  const initialPosition = camera.position.clone()
  const initialTarget = controls.target.clone()

  engine.setView('top')
  engine.reset()

  expect(camera.position.x).toBeCloseTo(controls.target.x)
  expect(camera.position.y).toBeCloseTo(controls.target.y)
  expect(camera.position.z).toBeGreaterThan(controls.target.z)
  expect(camera.up.toArray()).toEqual([0, 1, 0])
  expect(camera.position.toArray()).toEqual(initialPosition.toArray())
  expect(controls.target.toArray()).toEqual(initialTarget.toArray())
  engine.dispose()
})

test('does not replace failed external layers with a procedural model', async () => {
  const canvas = document.createElement('canvas')
  Object.defineProperty(canvas, 'clientWidth', { value: 640 })
  Object.defineProperty(canvas, 'clientHeight', { value: 480 })
  const engine = new ViewerEngine(canvas)

  await engine.load({
    unit: 'mm',
    layers: [{
      id: 'right-upper-lobe', name: 'Right upper lobe',
      color: '#e543d7',
      opacity: 0.72,
      visible: true,
      assets: { medium: 'https://example.test/missing.glb' },
    }],
  })

  expect(engine.hasFallbackModel()).toBe(false)
  expect(engine.layerSnapshots()[0]?.loadState).toBe('error')
  engine.dispose()
})
