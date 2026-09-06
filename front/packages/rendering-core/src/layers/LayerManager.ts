import type { Object3D } from 'three'
import type { LayerLoadState, LayerSnapshot } from '../types'

interface ManagedLayer extends LayerSnapshot {
  object?: Object3D
}

export class LayerManager {
  readonly #layers = new Map<string, ManagedLayer>()
  #visibilityBeforeIsolation: Map<string, boolean> | null = null

  constructor(ids: string[] = []) {
    for (const id of ids) this.#layers.set(id, this.defaultLayer(id))
  }

  register(id: string, object: Object3D, color = '#ffffff', opacity = 1, visible = true) {
    const layer: ManagedLayer = { id, object, color, opacity, visible, loadState: 'ready' }
    this.#layers.set(id, layer)
    this.apply(layer)
  }

  setLoadState(id: string, loadState: LayerLoadState) { this.require(id).loadState = loadState }

  setVisible(id: string, visible: boolean) {
    const layer = this.require(id)
    layer.visible = visible
    if (layer.object) layer.object.visible = visible
  }

  setOpacity(id: string, opacity: number) {
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new Error('Opacity must be between 0 and 1')
    const layer = this.require(id)
    layer.opacity = opacity
    layer.object?.traverse((child) => {
      if (!('material' in child)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        if (material && typeof material === 'object' && 'opacity' in material) {
          material.opacity = opacity
          material.transparent = opacity < 1
          material.needsUpdate = true
        }
      }
    })
  }

  setColor(id: string, color: string) {
    const layer = this.require(id)
    layer.color = color
    layer.object?.traverse((child) => {
      if (!('material' in child)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        if (material && typeof material === 'object' && 'color' in material && material.color) {
          material.color.set(color)
        }
      }
    })
  }

  isolate(id: string) {
    this.require(id)
    if (!this.#visibilityBeforeIsolation) {
      this.#visibilityBeforeIsolation = new Map(
        [...this.#layers].map(([layerId, layer]) => [layerId, layer.visible]),
      )
    }
    for (const layerId of this.#layers.keys()) this.setVisible(layerId, layerId === id)
  }

  closeIsolation() {
    if (!this.#visibilityBeforeIsolation) return
    for (const [id, visible] of this.#visibilityBeforeIsolation) this.setVisible(id, visible)
    this.#visibilityBeforeIsolation = null
  }

  visibleIds() { return [...this.#layers.values()].filter((layer) => layer.visible).map((layer) => layer.id) }
  snapshots(): LayerSnapshot[] { return [...this.#layers.values()].map(({ object: _, ...layer }) => ({ ...layer })) }

  objectForEngine(id: string) { return this.require(id).object }
  remove(id: string) { const value = this.require(id); this.#layers.delete(id); return value.object }

  private require(id: string) {
    const layer = this.#layers.get(id)
    if (!layer) throw new Error(`Unknown layer: ${id}`)
    return layer
  }

  private defaultLayer(id: string): ManagedLayer {
    return { id, visible: true, opacity: 1, color: '#ffffff', loadState: 'idle' }
  }

  private apply(layer: ManagedLayer) {
    this.setVisible(layer.id, layer.visible)
    this.setOpacity(layer.id, layer.opacity)
    this.setColor(layer.id, layer.color)
  }
}
