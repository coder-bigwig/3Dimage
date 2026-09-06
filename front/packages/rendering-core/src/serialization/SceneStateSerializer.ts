export interface SceneState {
  schemaVersion: 1
  background: string
  camera: { position: [number, number, number]; target: [number, number, number] }
  layers: Array<{ id: string; visible: boolean; opacity: number; color: string; matrix: number[] }>
  exploded: boolean
  clippingPlanes: Array<{ normal: [number, number, number]; constant: number }>
  measurements: unknown[]
  annotations: unknown[]
}

const finite = (values: number[]) => values.every(Number.isFinite)

export class SceneStateSerializer {
  serialize(state: SceneState): string {
    this.validate(state)
    const durable: SceneState = {
      schemaVersion: 1,
      background: state.background,
      camera: { position: [...state.camera.position], target: [...state.camera.target] },
      layers: state.layers.map(layer => ({ id: layer.id, visible: layer.visible, opacity: layer.opacity, color: layer.color, matrix: [...layer.matrix] })),
      exploded: state.exploded,
      clippingPlanes: state.clippingPlanes.map(plane => ({ normal: [...plane.normal], constant: plane.constant })),
      measurements: structuredClone(state.measurements),
      annotations: structuredClone(state.annotations),
    }
    return JSON.stringify(durable)
  }

  deserialize(json: string): SceneState {
    if (new TextEncoder().encode(json).byteLength > 2_000_000) throw new Error('Scene state exceeds 2 MB')
    let parsed: unknown
    try { parsed = JSON.parse(json) } catch { throw new Error('Scene state is not valid JSON') }
    this.validate(parsed)
    return parsed
  }

  private validate(value: unknown): asserts value is SceneState {
    if (!value || typeof value !== 'object') throw new Error('Scene state must be an object')
    const state = value as Partial<SceneState>
    if (state.schemaVersion !== 1) throw new Error('Unsupported scene state version')
    if (typeof state.background !== 'string' || typeof state.exploded !== 'boolean') throw new Error('Invalid scene appearance')
    if (!state.camera || !finite(state.camera.position ?? []) || state.camera.position.length !== 3 || !finite(state.camera.target ?? []) || state.camera.target.length !== 3) throw new Error('Invalid camera state')
    if (!Array.isArray(state.layers) || state.layers.some(layer => !layer || typeof layer.id !== 'string' || typeof layer.visible !== 'boolean' || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1 || typeof layer.color !== 'string' || layer.matrix.length !== 16 || !finite(layer.matrix))) throw new Error('Invalid layer state')
    if (!Array.isArray(state.clippingPlanes) || state.clippingPlanes.some(plane => plane.normal.length !== 3 || !finite(plane.normal) || !Number.isFinite(plane.constant))) throw new Error('Invalid clipping planes')
    if (!Array.isArray(state.measurements) || !Array.isArray(state.annotations)) throw new Error('Invalid viewer records')
  }
}
