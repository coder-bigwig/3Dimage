export type ViewerAssetQuality = 'low' | 'medium' | 'high' | 'canonical'

export interface ConvertedLayer {
  id: string
  name: string
  color: string
  opacity?: number
  visible?: boolean
  files: Partial<Record<ViewerAssetQuality, string>>
}

export interface ConvertedCase {
  caseId: string
  coordinateSystem: 'LPS' | 'RAS'
  layers: ConvertedLayer[]
}

const safeGlbPath = /^[A-Za-z0-9][A-Za-z0-9._/-]*\.glb$/

export function buildViewerManifest(input: ConvertedCase, assetBaseUrl: string) {
  const base = assetBaseUrl.replace(/\/$/, '')
  return {
    schemaVersion: 1 as const,
    caseId: input.caseId,
    unit: 'mm' as const,
    coordinateSystem: input.coordinateSystem,
    layers: input.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      color: layer.color,
      opacity: layer.opacity ?? 1,
      visible: layer.visible ?? true,
      assets: Object.fromEntries(Object.entries(layer.files).map(([quality, file]) => {
        if (!file || !safeGlbPath.test(file) || file.includes('..') || file.startsWith('/')) {
          throw new Error(`Layer ${layer.id} requires a safe relative GLB path`)
        }
        return [quality, `${base}/${file}`]
      })),
    })),
  }
}
