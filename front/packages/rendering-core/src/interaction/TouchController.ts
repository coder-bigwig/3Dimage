import type { ViewerMode } from '../../../../src/features/viewer/viewer.store'

export interface TouchCallbacks {
  orbit(deltaX: number, deltaY: number): void
  zoom(scale: number): void
  pan(deltaX: number, deltaY: number): void
  moveLayer(deltaX: number, deltaY: number): void
  pick(clientX: number, clientY: number): void
  manipulateClip(deltaX: number, deltaY: number): void
  cancelIncomplete(): void
}

export class TouchController {
  readonly #pointers = new Map<number, { x: number; y: number }>()
  #mode: ViewerMode = 'browse'
  #lastDistance = 0

  constructor(private readonly element: HTMLElement, private readonly callbacks: TouchCallbacks) {
    element.addEventListener('pointerdown', this.onPointerDown)
    element.addEventListener('pointermove', this.onPointerMove)
    element.addEventListener('pointerup', this.onPointerUp)
    element.addEventListener('pointercancel', this.onPointerUp)
  }

  setMode(mode: ViewerMode) {
    if (mode !== this.#mode) this.callbacks.cancelIncomplete()
    this.releasePointers()
    this.#mode = mode
  }

  dispose() {
    this.releasePointers()
    this.element.removeEventListener('pointerdown', this.onPointerDown)
    this.element.removeEventListener('pointermove', this.onPointerMove)
    this.element.removeEventListener('pointerup', this.onPointerUp)
    this.element.removeEventListener('pointercancel', this.onPointerUp)
  }

  private onPointerDown = (event: PointerEvent) => {
    this.element.setPointerCapture(event.pointerId)
    this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (this.#mode === 'measure' || this.#mode === 'annotate') this.callbacks.pick(event.clientX, event.clientY)
  }

  private onPointerMove = (event: PointerEvent) => {
    const previous = this.#pointers.get(event.pointerId)
    if (!previous) return
    event.preventDefault()
    const dx = event.clientX - previous.x
    const dy = event.clientY - previous.y
    this.#pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (this.#pointers.size === 2 && this.#mode === 'browse') {
      const [a, b] = [...this.#pointers.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (this.#lastDistance) this.callbacks.zoom(distance / this.#lastDistance)
      this.#lastDistance = distance
      this.callbacks.pan(dx / 2, dy / 2)
    } else if (this.#pointers.size === 1) {
      if (this.#mode === 'browse') this.callbacks.orbit(dx, dy)
      if (this.#mode === 'moveLayer') this.callbacks.moveLayer(dx, dy)
      if (this.#mode === 'clip') this.callbacks.manipulateClip(dx, dy)
    }
  }

  private onPointerUp = (event: PointerEvent) => {
    this.#pointers.delete(event.pointerId)
    this.#lastDistance = 0
    if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId)
  }

  private releasePointers() {
    for (const id of this.#pointers.keys()) {
      if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id)
    }
    this.#pointers.clear()
    this.#lastDistance = 0
  }
}
