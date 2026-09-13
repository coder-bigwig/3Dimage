import { BufferGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, SphereGeometry, Vector2, Vector3, type Object3D } from 'three'
import { ToolRecords, type Anchor, type RecordTool, type ToolRecord } from './ToolRecords'

export type InteractiveTool = RecordTool | 'moveLayer' | 'clipPlane' | null
export interface ToolUpdate { items: ToolRecord[]; pending: number; selected: string; message: string }

export class InteractiveTools {
  readonly records = new ToolRecords()
  readonly overlay = new Group()
  tool: InteractiveTool = null
  text = ''
  selected = ''
  #message = ''
  #down: [number, number] | null = null
  #labels: { element: HTMLSpanElement; anchor: Anchor }[] = []
  #raycaster = new Raycaster()
  constructor(private canvas: HTMLCanvasElement, private camera: PerspectiveCamera, private root: Group, private objects: () => Object3D[], private controlsEnabled: (enabled: boolean) => void, private clipped: (point: Vector3) => boolean) {
    this.overlay.name = 'tool-overlay'
    root.add(this.overlay)
    canvas.addEventListener('pointerdown', this.down)
    canvas.addEventListener('pointerup', this.up)
  }
  activate(tool: InteractiveTool) { this.tool = tool; this.records.pending = []; this.controlsEnabled(!tool || tool === 'moveLayer' || tool === 'clipPlane'); this.#message = ''; this.refresh() }
  private down = (event: PointerEvent) => { this.#down = event.button === 0 ? [event.clientX, event.clientY] : null }
  private up = (event: PointerEvent) => {
    if (!this.tool || this.tool === 'clipPlane' || !this.#down || Math.hypot(event.clientX - this.#down[0], event.clientY - this.#down[1]) > 5) return
    this.#down = null
    const rect = this.canvas.getBoundingClientRect()
    this.root.updateMatrixWorld(true)
    this.camera.updateMatrixWorld(true)
    this.#raycaster.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera)
    const targets = this.objects().filter(object => object.visible)
    const hit = this.#raycaster.intersectObjects(targets, true).find(hit => {
      if (this.clipped(hit.point)) return false
      let object: Object3D | null = hit.object
      while (object && object !== this.root) { if (!object.visible) return false; object = object.parent }
      return true
    })
    if (!hit) { this.#message = '请点击可见模型表面'; this.emit(); return }
    let layer = hit.object
    while (layer.parent && layer.parent !== this.root) layer = layer.parent
    this.selected = layer.name
    if (this.tool !== 'moveLayer') {
      const anchor: Anchor = { layerId: layer.name, position: layer.worldToLocal(hit.point.clone()).toArray() }
      try { this.records.add(this.tool, anchor, this.text, this.resolve); this.#message = '' }
      catch (error) { this.#message = (error as Error).message }
    }
    this.refresh()
  }
  resolve = (anchor: Anchor) => {
    const layer = this.objects().find(object => object.name === anchor.layerId)
    const point = new Vector3(...anchor.position)
    // Use original object coordinates, excluding user displacement and viewing transforms.
    // GLB root transforms are normally identity; preserve root scale for physical units.
    return layer ? point.multiply(layer.scale) : point
  }
  private localPoint(anchor: Anchor) {
    const layer = this.objects().find(object => object.name === anchor.layerId)
    return layer ? this.root.worldToLocal(layer.localToWorld(new Vector3(...anchor.position))) : new Vector3(...anchor.position)
  }
  command(command: string) {
    try {
      if (command === 'undo') this.records.undo()
      if (command === 'new') this.records.pending = []
      if (command === 'clear' && this.tool && this.tool !== 'moveLayer' && this.tool !== 'clipPlane') this.records.clear(this.tool)
      if (command === 'finish') this.records.finishArea(this.resolve)
      this.#message = ''
    } catch (error) { this.#message = (error as Error).message }
    this.refresh()
  }
  remove(id: string) { this.records.remove(id); this.refresh() }
  restore(items: ToolRecord[]) { this.records.restore(items); this.refresh() }
  snapshot(): ToolUpdate { return { items: structuredClone(this.records.items), pending: this.records.pending.length, selected: this.selected, message: this.#message } }
  emit() { this.canvas.dispatchEvent(new CustomEvent('viewer-tools', { bubbles: true, detail: this.snapshot() })) }
  refresh() {
    this.clearVisuals()
    const all = [...this.records.items, { id: 'pending', tool: this.tool, points: this.records.pending, label: '' }]
    const radius = Math.max(this.camera.position.distanceTo(new Vector3()) * .0018, .4)
    for (const record of all) {
      if (!record.points.length) continue
      if (record.points.some(point => this.objects().find(object => object.name === point.layerId)?.visible === false)) continue
      const points = record.points.map(point => this.localPoint(point))
      for (const point of points) {
        const dot = new Mesh(new SphereGeometry(radius, 10, 8), new MeshBasicMaterial({ color: '#ffb020', depthTest: false }))
        dot.position.copy(point); dot.renderOrder = 1000; this.overlay.add(dot)
      }
      if (points.length > 1) {
        if (record.tool === 'closedArea' && record.id !== 'pending') points.push(points[0])
        const line = new Line(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: '#ffb020', depthTest: false }))
        line.renderOrder = 1000; this.overlay.add(line)
      }
      if (record.label) {
        const element = document.createElement('span'); element.className = 'model-tool-label'; element.textContent = record.label
        this.canvas.parentElement?.append(element)
        this.#labels.push({ element, anchor: record.points[record.points.length - 1] })
      }
    }
    this.emit()
  }
  updateLabels() {
    for (const { element, anchor } of this.#labels) {
      const world = this.root.localToWorld(this.localPoint(anchor))
      const clipped = this.clipped(world)
      const point = world.project(this.camera)
      element.hidden = clipped || point.z > 1 || point.z < -1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1
      element.style.left = `${(point.x + 1) / 2 * this.canvas.clientWidth}px`
      element.style.top = `${(1 - point.y) / 2 * this.canvas.clientHeight}px`
    }
  }
  private clearVisuals() {
    for (const child of [...this.overlay.children]) {
      if (child instanceof Mesh || child instanceof Line) { child.geometry.dispose(); child.material.dispose() }
      this.overlay.remove(child)
    }
    for (const { element } of this.#labels) element.remove()
    this.#labels = []
  }
  dispose() { this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointerup', this.up); this.clearVisuals(); this.overlay.removeFromParent() }
}
