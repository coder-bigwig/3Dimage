import { Plane, Raycaster, Vector2, Vector3, type Group, type Object3D, type PerspectiveCamera } from 'three'

/** Translates a picked layer on the camera-facing plane through the grab point. */
export class LayerDragController {
  enabled = true
  private ray = new Raycaster()
  private drag: { pointer: number; object: Object3D; start: Vector3; hit: Vector3; plane: Plane } | null = null
  constructor(private canvas: HTMLCanvasElement, private camera: PerspectiveCamera, private root: Group,
    private objects: () => Object3D[], private controlsEnabled: (enabled: boolean) => void,
    private clipped: (point: Vector3) => boolean, private completed: (id: string, start: Vector3) => void) {
    canvas.addEventListener('pointerdown', this.down, true)
    canvas.addEventListener('pointermove', this.move, true)
    canvas.addEventListener('pointerup', this.up, true)
    canvas.addEventListener('pointercancel', this.cancel, true)
    canvas.addEventListener('lostpointercapture', this.cancel, true)
  }
  private aim(event: PointerEvent) {
    const r = this.canvas.getBoundingClientRect()
    this.root.updateMatrixWorld(true); this.camera.updateMatrixWorld(true)
    this.ray.setFromCamera(new Vector2((event.clientX - r.left) / r.width * 2 - 1, 1 - (event.clientY - r.top) / r.height * 2), this.camera)
  }
  private down = (event: PointerEvent) => {
    if (!this.enabled || this.drag || event.button !== 0) return
    this.aim(event)
    const targets = this.objects().filter(o => o.visible)
    const hit = this.ray.intersectObjects(targets, true).find(hit => {
      if (this.clipped(hit.point)) return false
      for (let o: Object3D | null = hit.object; o && o !== this.root; o = o.parent) if (!o.visible) return false
      return true
    })
    if (!hit) return
    let object = hit.object
    while (object.parent && !targets.includes(object)) object = object.parent
    if (!object.parent) return
    this.drag = { pointer: event.pointerId, object, start: object.position.clone(), hit: object.parent.worldToLocal(hit.point.clone()), plane: new Plane().setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new Vector3()), hit.point) }
    this.controlsEnabled(false)
    this.canvas.setPointerCapture(event.pointerId)
    this.canvas.style.cursor = 'grabbing'
    event.preventDefault(); event.stopImmediatePropagation()
  }
  private move = (event: PointerEvent) => {
    const drag = this.drag
    if (!drag || event.pointerId !== drag.pointer) return
    this.aim(event)
    const point = this.ray.ray.intersectPlane(drag.plane, new Vector3())
    if (point && drag.object.parent) drag.object.position.copy(drag.start).add(drag.object.parent.worldToLocal(point).sub(drag.hit))
    event.preventDefault(); event.stopImmediatePropagation()
  }
  private up = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.pointer) return
    this.move(event)
    this.finish(false)
  }
  private cancel = () => { this.finish(true) }
  finish(cancelled = false) {
    const drag = this.drag
    if (!drag) return
    this.drag = null
    if (cancelled) drag.object.position.copy(drag.start)
    else if (!drag.object.position.equals(drag.start)) this.completed(drag.object.name, drag.start)
    if (this.canvas.hasPointerCapture(drag.pointer)) this.canvas.releasePointerCapture(drag.pointer)
    this.canvas.style.cursor = ''
    this.controlsEnabled(true)
  }
  dispose() {
    this.finish(true)
    this.canvas.removeEventListener('pointerdown', this.down, true)
    this.canvas.removeEventListener('pointermove', this.move, true)
    this.canvas.removeEventListener('pointerup', this.up, true)
    this.canvas.removeEventListener('pointercancel', this.cancel, true)
    this.canvas.removeEventListener('lostpointercapture', this.cancel, true)
  }
}
