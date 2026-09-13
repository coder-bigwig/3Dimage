export type AssetQuality = 'low' | 'medium' | 'high' | 'canonical'
export type LayerLoadState = 'idle' | 'loading' | 'ready' | 'error'

export interface RenderLayerManifest {
  id: string
  name: string
  color: string
  opacity: number
  visible: boolean
  assets: Partial<Record<AssetQuality, string>>
}

export interface RenderManifest {
  renderStyle?: 'clinical'
  unit: 'mm'
  coordinateSystem?: 'LPS' | 'RAS'
  layers: RenderLayerManifest[]
}

export interface LayerSnapshot {
  id: string
  visible: boolean
  opacity: number
  color: string
  loadState: LayerLoadState
}

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
