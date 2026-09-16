import { BufferGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, SphereGeometry, Vector2, Vector3, type Object3D } from 'three'
import { ToolRecords, type Anchor, type RecordTool, type ToolRecord } from './ToolRecords'

export type InteractiveTool = RecordTool | 'moveLayer' | 'clipPlane' | null
export interface ToolUpdate { items: ToolRecord[]; pending: number; selected: string; message: string }
interface ProjectedLabel { element: HTMLSpanElement; anchor: Anchor; offset: [number, number]; leader?: SVGSVGElement; line?: SVGLineElement }

export class InteractiveTools {
  readonly records = new ToolRecords()
  readonly overlay = new Group()
  tool: InteractiveTool = null
  text = ''
  selected = ''
  #message = ''
  #down: [number, number] | null = null
  #labels: ProjectedLabel[] = []
  #lastTap = { time: 0, x: 0, y: 0 }
  #ignoreTouchDoubleClick = false
  #raycaster = new Raycaster()
  constructor(private canvas: HTMLCanvasElement, private camera: PerspectiveCamera, private root: Group, private objects: () => Object3D[], private controlsEnabled: (enabled: boolean) => void, private clipped: (point: Vector3) => boolean) {
    this.overlay.name = 'tool-overlay'
    root.add(this.overlay)
    canvas.addEventListener('pointerdown', this.down)
    canvas.addEventListener('pointerup', this.up)
    canvas.addEventListener('dblclick', this.doubleClick)
    canvas.addEventListener('pointercancel', this.cancelTouch)
  }
  activate(tool: InteractiveTool) { this.cancelTouch(); this.tool = tool; this.records.pending = []; this.controlsEnabled(!tool || tool === 'annotation' || tool === 'moveLayer' || tool === 'clipPlane'); this.#message = ''; this.refresh() }
  private cancelTouch = () => { this.#down = null; this.#lastTap.time = 0 }
  private down = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') this.#ignoreTouchDoubleClick = false
    this.#down = event.button === 0 ? [event.clientX, event.clientY] : null
  }
  private up = (event: PointerEvent) => {
    if (!this.tool || this.tool === 'clipPlane' || !this.#down || Math.hypot(event.clientX - this.#down[0], event.clientY - this.#down[1]) > 5) return
    this.#down = null
    if (this.tool === 'annotation') {
      if (event.pointerType === 'touch') {
        // Compare when the user touched, not when a busy render thread handled the events.
        const now = event.timeStamp
        if (this.#lastTap.time > 0 && now >= this.#lastTap.time && now - this.#lastTap.time < 350 && Math.hypot(event.clientX - this.#lastTap.x, event.clientY - this.#lastTap.y) < 24) {
          this.#ignoreTouchDoubleClick = true
          this.pick(event); this.#lastTap.time = 0
        } else this.#lastTap = { time: now, x: event.clientX, y: event.clientY }
      }
      return
    }
    this.pick(event)
  }
  private doubleClick = (event: MouseEvent) => {
    // Touch browsers may synthesize a compatibility dblclick after the pointer events.
    // Consume it once, regardless of how long rendering delayed its delivery.
    if (this.#ignoreTouchDoubleClick) { this.#ignoreTouchDoubleClick = false; return }
    if (this.tool === 'annotation') this.pick(event)
  }
  private pick(event: MouseEvent) {
    if (!this.tool || this.tool === 'clipPlane') return
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
      try {
        if (this.tool === 'annotation' && this.records.items.filter(item => item.tool === 'annotation').length >= 200) throw new Error('最多保存 200 个三维标注')
        this.records.add(this.tool, anchor, this.tool === 'annotation' ? this.text.trim() || '标注' : this.text, this.resolve); this.#message = ''
        if (this.tool === 'annotation') this.selectAnnotation(this.records.items[this.records.items.length - 1].id)
      }
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
      if (command === 'clear' && this.tool && this.tool !== 'moveLayer' && this.tool !== 'clipPlane') {
        if (this.tool === 'annotation') this.records.clear('annotation')
        else this.records.clearMeasurements()
      }
      if (command === 'finish') this.records.finishArea(this.resolve)
      this.#message = ''
    } catch (error) { this.#message = (error as Error).message }
    this.refresh()
  }
  remove(id: string) { this.records.remove(id); this.refresh() }
  editAnnotation(id: string, text: string, offset?: [number, number]) { this.records.editAnnotation(id, text, offset); this.refresh() }
  restoreAnnotations(items: ToolRecord[]) { this.records.restore([...this.records.items.filter(item => item.tool !== 'annotation'), ...items]); this.refresh() }
  private selectAnnotation(id: string) { this.canvas.dispatchEvent(new CustomEvent('viewer-annotation-selected', { bubbles: true, detail: id })) }
  restore(items: ToolRecord[]) { this.records.restore(items); this.refresh() }
  snapshot(): ToolUpdate { return { items: structuredClone(this.records.items), pending: this.records.pending.length, selected: this.selected, message: this.#message } }
  emit() { this.canvas.dispatchEvent(new CustomEvent('viewer-tools', { bubbles: true, detail: this.snapshot() })) }
  refresh() {
    this.clearVisuals()
    const all = [...this.records.items, { id: 'pending', tool: this.tool, points: this.records.pending, label: '', labelOffset: undefined }]
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
        const element = document.createElement('span')
        const isAnnotation = record.tool === 'annotation'
        element.className = isAnnotation ? 'model-tool-label model-annotation-label' : 'model-tool-label model-measurement-label'
        if (!isAnnotation && record.tool) element.dataset.measurementTool = record.tool
        element.textContent = record.label
        this.canvas.parentElement?.append(element)
        const label: ProjectedLabel = { element, anchor: record.points[record.points.length - 1], offset: record.tool === 'annotation' ? [...(record.labelOffset ?? [55, -45])] : [0, 0] }
        if (isAnnotation) {
          element.dataset.annotationId = record.id
          element.setAttribute('role', 'button'); element.tabIndex = this.tool === 'annotation' ? 0 : -1
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.classList.add('annotation-leader')
          const line = document.createElementNS(svg.namespaceURI, 'line') as SVGLineElement
          svg.append(line); this.canvas.parentElement?.append(svg)
          label.leader = svg; label.line = line
          let start: { x: number; y: number; time: number; offset: [number, number]; moved: boolean } | null = null
          element.onpointerdown = event => {
            if (this.tool !== 'annotation' || event.button !== 0) return
            event.stopPropagation(); event.preventDefault(); element.setPointerCapture(event.pointerId)
            start = { x: event.clientX, y: event.clientY, time: performance.now(), offset: [...label.offset], moved: false }
          }
          element.onpointermove = event => {
            if (!start || performance.now() - start.time < 350) return
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 3) return
            start.moved = true
            label.offset = [Math.max(-2000, Math.min(2000, start.offset[0] + event.clientX - start.x)), Math.max(-2000, Math.min(2000, start.offset[1] + event.clientY - start.y))]
          }
          element.onpointerup = event => {
            if (!start) return
            event.stopPropagation()
            const moved = start.moved; start = null
            if (moved) this.editAnnotation(record.id, record.label, label.offset)
            else this.selectAnnotation(record.id)
          }
          element.onpointercancel = () => { if (start) label.offset = start.offset; start = null }
          element.onkeydown = event => { if (this.tool === 'annotation' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); this.selectAnnotation(record.id) } }
        }
        this.#labels.push(label)
      }
    }
    this.emit()
  }
  updateLabels() {
    for (const { element, anchor, offset, leader, line } of this.#labels) {
      const world = this.root.localToWorld(this.localPoint(anchor))
      const clipped = this.clipped(world)
      const point = world.project(this.camera)
      element.hidden = clipped || point.z > 1 || point.z < -1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1
      const x = (point.x + 1) / 2 * this.canvas.clientWidth, y = (1 - point.y) / 2 * this.canvas.clientHeight
      const left = Math.max(4, Math.min(this.canvas.clientWidth - element.offsetWidth - 4, x + offset[0]))
      const top = Math.max(4, Math.min(this.canvas.clientHeight - element.offsetHeight - 4, y + offset[1]))
      element.style.left = `${left}px`; element.style.top = `${top}px`
      if (leader && line) {
        leader.style.display = element.hidden ? 'none' : ''
        line.setAttribute('x1', `${x}`); line.setAttribute('y1', `${y}`)
        line.setAttribute('x2', `${left + element.offsetWidth / 2}`); line.setAttribute('y2', `${top + element.offsetHeight / 2}`)
      }
    }
  }
  private clearVisuals() {
    for (const child of [...this.overlay.children]) {
      if (child instanceof Mesh || child instanceof Line) { child.geometry.dispose(); child.material.dispose() }
      this.overlay.remove(child)
    }
    for (const { element, leader } of this.#labels) { element.remove(); leader?.remove() }
    this.#labels = []
  }
  dispose() { this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointerup', this.up); this.canvas.removeEventListener('dblclick', this.doubleClick); this.canvas.removeEventListener('pointercancel', this.cancelTouch); this.clearVisuals(); this.overlay.removeFromParent() }
}
