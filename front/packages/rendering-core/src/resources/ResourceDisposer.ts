import { Material, Object3D, Texture, WebGLRenderTarget } from 'three'

export class ResourceDisposer {
  disposeObject(root: Object3D) {
    const geometries = new Set<{ dispose(): void }>()
    const materials = new Set<Material>()
    const textures = new Set<Texture>()
    const renderTargets = new Set<WebGLRenderTarget>()

    root.traverse((object) => {
      if ('geometry' in object && object.geometry && typeof object.geometry === 'object'
        && 'dispose' in object.geometry) geometries.add(object.geometry as { dispose(): void })
      if (!('material' in object) || !object.material) return
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of objectMaterials) {
        if (!(material instanceof Material)) continue
        materials.add(material)
        for (const value of Object.values(material)) {
          if (value instanceof Texture) textures.add(value)
          if (value instanceof WebGLRenderTarget) renderTargets.add(value)
        }
      }
    })
    for (const geometry of geometries) geometry.dispose()
    for (const texture of textures) texture.dispose()
    for (const target of renderTargets) target.dispose()
    for (const material of materials) material.dispose()
    root.removeFromParent()
  }
}
