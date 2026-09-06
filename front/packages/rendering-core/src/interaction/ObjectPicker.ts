import { Camera, Object3D, Raycaster, Vector2 } from 'three'

export interface PickResult {
  layerId: string
  point: [number, number, number]
  faceIndex: number | null
}

export class ObjectPicker {
  readonly #raycaster = new Raycaster()
  readonly #pointer = new Vector2()

  pick(clientX: number, clientY: number, canvas: HTMLCanvasElement, camera: Camera, roots: Object3D[]): PickResult | null {
    const bounds = canvas.getBoundingClientRect()
    this.#pointer.set(((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1)
    this.#raycaster.setFromCamera(this.#pointer, camera)
    const hit = this.#raycaster.intersectObjects(roots, true)[0]
    if (!hit) return null
    let root: Object3D | null = hit.object
    while (root?.parent && !roots.includes(root)) root = root.parent
    return { layerId: root?.name ?? hit.object.name, point: hit.point.toArray(), faceIndex: hit.faceIndex ?? null }
  }
}
