import {
  AmbientLight, Box3, Color, DirectionalLight, Group, MOUSE, PerspectiveCamera, Plane, Quaternion, Scene, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LayerManager } from './layers/LayerManager'
import { GlbLayerLoader } from './loaders/GlbLayerLoader'
import { applyClinicalMaterial } from './materials/ClinicalMaterial'
import { selectLayerAsset } from './loaders/ManifestLoader'
import { QualityManager } from './performance/QualityManager'
import { ResourceDisposer } from './resources/ResourceDisposer'
import { createProceduralLungModel } from './fallback/ProceduralLungModel'
import type { RenderManifest, ViewPreset } from './types'
import { InteractiveTools, type InteractiveTool } from './tools/InteractiveTools'
import { LayerDragController } from './tools/LayerDragController'
import type { ToolRecord } from './tools/ToolRecords'

export interface ViewerSavedState {
  version: 1
  camera: { position: number[]; target: number[]; up: number[] }
  root: { position: number[]; quaternion: number[] }
  layers: Array<{ id: string; visible: boolean; color: string; opacity: number; position: number[] }>
  records: ToolRecord[]
  background: string
  clip: { axis: 'x' | 'y' | 'z'; value: number; enabled: boolean; flipped: boolean }
}

export class ViewerEngine {
  readonly #renderer: WebGLRenderer
  readonly #scene = new Scene()
  readonly #modelRoot = new Group()
  readonly #lighting = new Group()
  #clinicalStyle = false
  readonly #rotationAxis = new Vector3()
  readonly #rotationStep = new Quaternion()
  readonly #orientation = new Quaternion()
  readonly #anatomicalBasis = new Quaternion()
  #autoRotating = false
  #coordinateSystem: RenderManifest['coordinateSystem']
  #previousFrameTime: number | undefined
  readonly #camera = new PerspectiveCamera(35, 1, 0.1, 10000)
  #controls: OrbitControls
  readonly #loader = new GlbLayerLoader()
  readonly #disposer = new ResourceDisposer()
  readonly #quality = new QualityManager()
  readonly #resizeObserver: ResizeObserver
  #layers = new LayerManager()
  #fallbackModel: Group | null = null
  #animationFrame = 0
  #abortController: AbortController | null = null
  #tools: InteractiveTools
  #drag: LayerDragController
  #initialPositions = new Map<string, Vector3>()
  #moveHistory: Array<{ id: string; position: Vector3 }> = []
  #clip: ViewerSavedState['clip'] = { axis: 'x', value: 100, enabled: false, flipped: false }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.#renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
    this.#renderer.setPixelRatio(this.#quality.pixelRatio())
    this.#scene.background = new Color('#d9d9d9')
    this.#lighting.add(new AmbientLight(0xffffff, 1.5), new DirectionalLight(0xffffff, 2.5))
    this.#scene.add(this.#modelRoot)
    this.#scene.add(this.#lighting)
    this.#camera.position.set(0, 0, 250)
    this.#controls = this.createControls()
    this.#tools = new InteractiveTools(canvas, this.#camera, this.#modelRoot,
      () => this.#modelRoot.children.filter(child => child !== this.#tools?.overlay),
      enabled => { this.#controls.enableRotate = enabled; this.#controls.enablePan = enabled },
      point => this.#renderer.clippingPlanes?.some(plane => plane.distanceToPoint(point) < 0) ?? false)
    this.#drag = new LayerDragController(canvas, this.#camera, this.#modelRoot,
      () => this.#modelRoot.children.filter(child => child !== this.#tools.overlay),
      enabled => { this.#controls.enabled = enabled },
      point => this.#renderer.clippingPlanes?.some(plane => plane.distanceToPoint(point) < 0) ?? false,
      (id, position) => { this.#moveHistory.push({ id, position }); if (this.#moveHistory.length > 100) this.#moveHistory.shift(); this.#tools.refresh() })
    this.#resizeObserver = new ResizeObserver(() => this.resize())
    this.#resizeObserver.observe(canvas)
    this.renderLoop()
  }

  async load(manifest: RenderManifest) {
    this.clear()
    this.#coordinateSystem = manifest.layers.length ? manifest.coordinateSystem : undefined
    this.#clinicalStyle = manifest.renderStyle === 'clinical'
    this.#lighting.clear()
    if (this.#clinicalStyle) {
      this.#lighting.add(new AmbientLight(0xffffff, .45))
      const anterior = this.#coordinateSystem === 'LPS' ? -1 : 1
      for (const [x, y, z, intensity, color] of [
        [-30000, 50000, 40000, 1.25, 0xffffff],
        [40000, 30000, 10000, .4, 0xe6eeff],
        [0, -40000, 30000, .3, 0xffffff],
      ]) {
        const light = new DirectionalLight(color, intensity)
        if (this.#coordinateSystem) light.position.set(x, anterior * y, z)
        else light.position.set(x, z, y)
        this.#lighting.add(light)
      }
    } else this.#lighting.add(new AmbientLight(0xffffff, 1.5), new DirectionalLight(0xffffff, 2.5))
    this.#anatomicalBasis.setFromAxisAngle(new Vector3(1, 0, 0), this.#coordinateSystem ? Math.PI / 2 : 0)
    if (this.#coordinateSystem === 'RAS') this.#anatomicalBasis.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
    // OrbitControls captures the camera's up axis at construction time.
    this.#controls.dispose()
    this.#camera.up.set(0, this.#coordinateSystem ? 0 : 1, this.#coordinateSystem ? 1 : 0)
    this.#controls = this.createControls()
    this.#abortController = new AbortController()
    this.#layers = new LayerManager(manifest.layers.map((layer) => layer.id))
    const quality = this.#quality.initialQuality()
    await Promise.allSettled(manifest.layers.map(async (layer) => {
      this.#layers.setLoadState(layer.id, 'loading')
      try {
        const asset = selectLayerAsset(layer, quality)
        const object = await this.#loader.load(asset.url, this.#abortController?.signal)
        if (this.#clinicalStyle) applyClinicalMaterial(object, layer.color, layer.opacity)
        object.name = layer.id
        this.#modelRoot.add(object)
        this.#layers.register(layer.id, object, layer.color, layer.opacity, layer.visible)
        this.#initialPositions.set(layer.id, object.position.clone())
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) this.#layers.setLoadState(layer.id, 'error')
      }
    }))
    if (manifest.layers.length === 0) {
      this.#fallbackModel = createProceduralLungModel()
      this.#modelRoot.add(this.#fallbackModel)
    }
    this.fitToVisibleLayers()
  }

  setVisible(id: string, visible: boolean) { this.#layers.setVisible(id, visible); this.#tools.refresh() }
  setOpacity(id: string, opacity: number) { this.#layers.setOpacity(id, opacity) }
  setColor(id: string, color: string) { this.#layers.setColor(id, color) }
  isolate(id: string) { this.#layers.isolate(id) }
  closeIsolation() { this.#layers.closeIsolation() }
  setBackground(color: string) { this.#scene.background = new Color(color) }
  setAutoRotate(enabled: boolean) { this.#autoRotating = enabled; this.#previousFrameTime = undefined }
  reset() {
    this.#drag.finish(true)
    this.#drag.enabled = true
    this.setAutoRotate(false)
    this.resetModelTransform()
    // Recreate controls to discard drag inertia before restoring the initial view.
    this.#controls.dispose()
    this.#camera.up.set(0, this.#coordinateSystem ? 0 : 1, this.#coordinateSystem ? 1 : 0)
    this.#controls = this.createControls()
    for (const [id, position] of this.#initialPositions) this.#layers.objectForEngine(id)?.position.copy(position)
    this.#moveHistory = []
    this.setClip({ ...this.#clip, enabled: false })
    this.#tools.activate(null)
    this.#tools.restore(this.#tools.records.items.filter(item => item.tool === 'annotation'))
    this.fitToVisibleLayers()
  }
  activateTool(tool: InteractiveTool) { this.#drag.finish(); this.#drag.enabled = tool === null || tool === 'moveLayer'; this.setAutoRotate(false); this.#tools.activate(tool) }
  restoreLayerPositions() {
    this.#drag.finish(true)
    for (const [id, position] of this.#initialPositions) this.#layers.objectForEngine(id)?.position.copy(position)
    this.#moveHistory = []
    this.#modelRoot.updateMatrixWorld(true)
    this.#tools.refresh()
  }
  setAnnotationText(text: string) { this.#tools.text = text }
  editAnnotation(id: string, text: string, offset?: [number, number]) { this.#tools.editAnnotation(id, text, offset) }
  restoreAnnotations(items: ToolRecord[]) { this.#tools.restoreAnnotations(items) }
  toolSnapshot() { return this.#tools.snapshot() }
  toolCommand(command: string) {
    if (this.#tools.tool === 'moveLayer' && command === 'undo') {
      const previous = this.#moveHistory.pop()
      if (previous) this.#layers.objectForEngine(previous.id)?.position.copy(previous.position)
      this.#tools.refresh()
    } else this.#tools.command(command)
  }
  removeRecord(id: string) { this.#tools.remove(id) }
  moveLayer(id: string, axis: 'x' | 'y' | 'z', offset: number) {
    const object = this.#layers.objectForEngine(id)
    if (!object || !Number.isFinite(offset)) return
    this.#moveHistory.push({ id, position: object.position.clone() })
    if (this.#moveHistory.length > 100) this.#moveHistory.shift()
    object.position[axis] = (this.#initialPositions.get(id)?.[axis] ?? 0) + offset
    this.#modelRoot.updateMatrixWorld(true)
    this.#tools.refresh()
  }
  layerOffset(id: string, axis: 'x' | 'y' | 'z') { return (this.#layers.objectForEngine(id)?.position[axis] ?? 0) - (this.#initialPositions.get(id)?.[axis] ?? 0) }
  setClip(clip: ViewerSavedState['clip']) {
    this.#clip = { ...clip }
    if (!clip.enabled) { this.#renderer.clippingPlanes = []; return }
    const box = new Box3()
    this.#modelRoot.children.filter(child => child !== this.#tools.overlay).forEach(child => box.expandByObject(child))
    if (box.isEmpty()) return
    const normal = new Vector3(); normal[clip.axis] = clip.flipped ? 1 : -1
    const threshold = box.min[clip.axis] + (box.max[clip.axis] - box.min[clip.axis]) * clip.value / 100
    this.#renderer.clippingPlanes = [new Plane(normal, -normal[clip.axis] * threshold)]
  }
  captureState(): ViewerSavedState {
    return {
      version: 1,
      camera: { position: this.#camera.position.toArray(), target: this.#controls.target.toArray(), up: this.#camera.up.toArray() },
      root: { position: this.#modelRoot.position.toArray(), quaternion: this.#modelRoot.quaternion.toArray() },
      layers: this.#layers.snapshots().map(layer => ({ ...layer, position: this.#layers.objectForEngine(layer.id)?.position.toArray() ?? [0, 0, 0] })),
      records: structuredClone(this.#tools.records.items), background: `#${(this.#scene.background as Color).getHexString()}`, clip: { ...this.#clip },
    }
  }
  restoreState(state: ViewerSavedState) {
    if (state.version !== 1 || state.layers.some(layer => !this.#initialPositions.has(layer.id))) throw new Error('方案与当前模型不匹配')
    this.reset()
    this.#camera.position.fromArray(state.camera.position); this.#camera.up.fromArray(state.camera.up)
    this.#controls.target.fromArray(state.camera.target)
    this.#modelRoot.position.fromArray(state.root.position); this.#modelRoot.quaternion.fromArray(state.root.quaternion)
    for (const layer of state.layers) {
      this.#layers.setVisible(layer.id, layer.visible); this.#layers.setColor(layer.id, layer.color); this.#layers.setOpacity(layer.id, layer.opacity)
      this.#layers.objectForEngine(layer.id)?.position.fromArray(layer.position)
    }
    this.#modelRoot.updateMatrixWorld(true)
    this.setBackground(state.background); this.setClip(state.clip); this.#controls.update()
    this.#tools.restore(state.records)
  }
  hasFallbackModel() { return this.#fallbackModel !== null }
  layerSnapshots() { return this.#layers.snapshots() }
  screenshot() { this.#renderer.render(this.#scene, this.#camera); return this.canvas.toDataURL('image/png') }

  setView(view: ViewPreset) {
    const distance = this.#camera.position.distanceTo(this.#controls.target) || 250
    const directions: Record<ViewPreset, Vector3> = {
      front: new Vector3(0, 0, 1), back: new Vector3(0, 0, -1),
      left: new Vector3(-1, 0, 0), right: new Vector3(1, 0, 0),
      top: new Vector3(0, 1, 0), bottom: new Vector3(0, -1, 0),
    }
    if (this.#coordinateSystem) {
      const anterior = this.#coordinateSystem === 'RAS' ? 1 : -1
      for (const direction of Object.values(directions)) {
        const { x, y, z } = direction
        direction.set(-anterior * x, anterior * z, y)
      }
    }
    this.#camera.position.copy(this.#controls.target).addScaledVector(directions[view], distance)
    this.#camera.up.set(0, view === 'top' || view === 'bottom' ? 0 : 1, view === 'top' ? -1 : view === 'bottom' ? 1 : 0)
    if (this.#coordinateSystem) {
      const { y, z } = this.#camera.up
      this.#camera.up.set(0, (this.#coordinateSystem === 'RAS' ? 1 : -1) * z, y)
    }
    this.#camera.lookAt(this.#controls.target)
    this.#controls.update()
  }

  dispose() {
    this.#drag.dispose()
    this.#abortController?.abort()
    cancelAnimationFrame(this.#animationFrame)
    this.#resizeObserver.disconnect()
    this.#tools.dispose()
    this.clear()
    this.#controls.dispose()
    this.#renderer.dispose()
  }

  private clear() {
    this.#drag.finish(true)
    this.resetModelTransform()
    this.#abortController?.abort()
    for (const snapshot of this.#layers.snapshots()) {
      const object = this.#layers.remove(snapshot.id)
      if (object) this.#disposer.disposeObject(object)
    }
    if (this.#fallbackModel) this.#disposer.disposeObject(this.#fallbackModel)
    this.#fallbackModel = null
    this.#initialPositions.clear()
  }

  private fitToVisibleLayers() {
    const box = new Box3()
    for (const snapshot of this.#layers.snapshots()) {
      const object = this.#layers.objectForEngine(snapshot.id)
      if (object?.visible) box.expandByObject(object)
    }
    if (this.#fallbackModel?.visible) box.expandByObject(this.#fallbackModel)
    if (box.isEmpty()) return
    const center = box.getCenter(new Vector3())
    const extent = box.getSize(new Vector3())
    const size = extent.length()
    // Leave the same breathing room as the reference, while fitting narrow screens.
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1
    const halfFov = this.#camera.fov * Math.PI / 360
    const height = this.#coordinateSystem ? extent.z : extent.y
    const depth = this.#coordinateSystem ? extent.y : extent.z
    const distance = Math.max(height, extent.x / aspect) / (2 * Math.tan(halfFov) * (this.#clinicalStyle ? .62 : .75)) + depth / 2
    this.#controls.target.copy(center)
    this.#camera.up.set(0, 1, 0)
    this.#camera.position.copy(center).add(new Vector3(0, 0, Math.max(distance, 10)))
    if (this.#coordinateSystem) {
      this.#camera.up.set(0, 0, 1)
      this.#camera.position.copy(center).add(new Vector3(0, (this.#coordinateSystem === 'RAS' ? 1 : -1) * Math.max(distance, 10), 0))
    }
    this.#camera.lookAt(center)
    this.#camera.near = Math.max(size / 1000, 0.01)
    this.#camera.far = Math.max(size * 100, 1000)
    this.#camera.updateProjectionMatrix()
    this.#controls.update()
  }

  private resize() {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (!width || !height) return
    this.#renderer.setSize(width, height, false)
    this.#camera.aspect = width / height
    this.#camera.updateProjectionMatrix()
  }

  private resetModelTransform() {
    this.#modelRoot.position.set(0, 0, 0)
    this.#modelRoot.quaternion.identity()
    this.#modelRoot.updateMatrixWorld(true)
    this.#previousFrameTime = undefined
  }

  private createControls() {
    const controls = new OrbitControls(this.#camera, this.canvas)
    controls.enableDamping = true
    controls.enableRotate = true
    controls.rotateSpeed = 1
    controls.mouseButtons.LEFT = MOUSE.ROTATE
    return controls
  }

  private renderLoop = (timestamp?: number) => {
    this.#controls.update()
    if (this.#autoRotating && timestamp !== undefined && this.#previousFrameTime !== undefined) {
      // Match the reference viewer: 0.5 degrees per 30 ms about screen-up.
      // Rotate the complete model around the viewing target, including tilted views.
      const seconds = Math.min((timestamp - this.#previousFrameTime) / 1000, 0.1)
      this.#rotationAxis.set(0, 1, 0).applyQuaternion(this.#camera.quaternion)
      this.#rotationStep.setFromAxisAngle(this.#rotationAxis, seconds * Math.PI / 10.8)
      this.#modelRoot.position.sub(this.#controls.target).applyQuaternion(this.#rotationStep).add(this.#controls.target)
      this.#modelRoot.quaternion.premultiply(this.#rotationStep)
    }
    this.#previousFrameTime = timestamp
    this.#renderer.render(this.#scene, this.#camera)
    this.#tools.updateLabels()
    this.#orientation.copy(this.#camera.quaternion).invert().multiply(this.#modelRoot.quaternion).multiply(this.#anatomicalBasis)
    this.canvas.dispatchEvent(new CustomEvent('viewer-orientation', { bubbles: true, detail: this.#orientation.toArray() }))
    this.#animationFrame = requestAnimationFrame(this.renderLoop)
  }
}
