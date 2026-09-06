import type { AssetQuality, RenderLayerManifest } from '../types'

const fallbackOrder: AssetQuality[] = ['medium', 'low', 'high', 'canonical']

export function selectLayerAsset(layer: RenderLayerManifest, preferred: AssetQuality) {
  const preferredUrl = layer.assets[preferred]
  if (preferredUrl) return { quality: preferred, url: preferredUrl }
  for (const quality of fallbackOrder) {
    const url = layer.assets[quality]
    if (url) return { quality, url }
  }
  throw new Error(`Layer ${layer.id} has no loadable GLB asset`)
}
