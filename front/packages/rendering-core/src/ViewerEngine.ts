import {
  AmbientLight, Box3, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LayerManager } from './layers/LayerManager'
import { GlbLayerLoader } from './loaders/GlbLayerLoader'
import { selectLayerAsset } from './loaders/ManifestLoader'
import { QualityManager } from './performance/QualityManager'
import { ResourceDisposer } from './resources/ResourceDisposer'
import type { RenderManifest, ViewPreset } from './types'

export class ViewerEngine {
  readonly #renderer: WebGLRenderer
  readonly #scene = new Scene()
  readonly #camera = new PerspectiveCamera(35, 1, 0.1, 10000)
  readonly #controls: OrbitControls
  readonly #loader = new GlbLayerLoader()
  readonly #disposer = new ResourceDisposer()
  readonly #quality = new QualityManager()
  readonly #resizeObserver: ResizeObserver
  #layers = new LayerManager()
  #animationFrame = 0
  #abortController: AbortController | null = null

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.#renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
    this.#renderer.setPixelRatio(this.#quality.pixelRatio())
    this.#scene.background = new Color('#d9d9d9')
    this.#scene.add(new AmbientLight(0xffffff, 1.5), new DirectionalLight(0xffffff, 2.5))
    this.#camera.position.set(0, 0, 250)
    this.#controls = new OrbitControls(this.#camera, canvas)
    this.#controls.enableDamping = true
    this.#resizeObserver = new ResizeObserver(() => this.resize())
    this.#resizeObserver.observe(canvas)
    this.renderLoop()
  }

  async load(manifest: RenderManifest) {
    this.clear()
    this.#abortController = new AbortController()
    this.#layers = new LayerManager(manifest.layers.map((layer) => layer.id))
    const quality = this.#quality.initialQuality()
    await Promise.allSettled(manifest.layers.map(async (layer) => {
      this.#layers.setLoadState(layer.id, 'loading')
      try {
        const asset = selectLayerAsset(layer, quality)
        const object = await this.#loader.load(asset.url, this.#abortController?.signal)
        object.name = layer.id
        this.#scene.add(object)
        this.#layers.register(layer.id, object, layer.color, layer.opacity, layer.visible)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) this.#layers.setLoadState(layer.id, 'error')
      }
    }))
    this.fitToVisibleLayers()
  }

  setVisible(id: string, visible: boolean) { this.#layers.setVisible(id, visible) }
  setOpacity(id: string, opacity: number) { this.#layers.setOpacity(id, opacity) }
  setColor(id: string, color: string) { this.#layers.setColor(id, color) }
  isolate(id: string) { this.#layers.isolate(id) }
  closeIsolation() { this.#layers.closeIsolation() }
  setBackground(color: string) { this.#scene.background = new Color(color) }
  setAutoRotate(enabled: boolean) { this.#controls.autoRotate = enabled }
  reset() { this.#controls.reset(); this.fitToVisibleLayers() }
  layerSnapshots() { return this.#layers.snapshots() }
  screenshot() { this.#renderer.render(this.#scene, this.#camera); return this.canvas.toDataURL('image/png') }

  setView(view: ViewPreset) {
    const distance = this.#camera.position.distanceTo(this.#controls.target) || 250
    const directions: Record<ViewPreset, Vector3> = {
      front: new Vector3(0, 0, 1), back: new Vector3(0, 0, -1),
      left: new Vector3(-1, 0, 0), right: new Vector3(1, 0, 0),
      top: new Vector3(0, 1, 0), bottom: new Vector3(0, -1, 0),
    }
    this.#camera.position.copy(this.#controls.target).addScaledVector(directions[view], distance)
    this.#camera.up.set(0, view === 'top' || view === 'bottom' ? 0 : 1, view === 'top' ? -1 : view === 'bottom' ? 1 : 0)
    this.#camera.lookAt(this.#controls.target)
    this.#controls.update()
  }

  dispose() {
    this.#abortController?.abort()
    cancelAnimationFrame(this.#animationFrame)
    this.#resizeObserver.disconnect()
    this.clear()
    this.#controls.dispose()
    this.#renderer.dispose()
  }

  private clear() {
    this.#abortController?.abort()
    for (const snapshot of this.#layers.snapshots()) {
      const object = this.#layers.remove(snapshot.id)
      if (object) this.#disposer.disposeObject(object)
    }
  }

  private fitToVisibleLayers() {
    const box = new Box3()
    for (const snapshot of this.#layers.snapshots()) {
      const object = this.#layers.objectForEngine(snapshot.id)
      if (object?.visible) box.expandByObject(object)
    }
    if (box.isEmpty()) return
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3()).length()
    this.#controls.target.copy(center)
    this.#camera.position.copy(center).add(new Vector3(0, 0, Math.max(size * 1.4, 10)))
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

  private renderLoop = () => {
    this.#controls.update()
    this.#renderer.render(this.#scene, this.#camera)
    this.#animationFrame = requestAnimationFrame(this.renderLoop)
  }
}
