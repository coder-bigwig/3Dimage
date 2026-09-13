import type { ViewerManifest } from './sharedViewer'

interface PublicManifestLayer {
  id: string
  name: string
  color: string
  opacity: number
  visible: boolean
  assets: Partial<Record<'low' | 'medium' | 'high' | 'canonical', string>>
}

interface PublicManifest {
  title?: string
  renderStyle?: 'clinical'
  caseId: string
  unit: 'mm'
  coordinateSystem: 'LPS' | 'RAS'
  layers: PublicManifestLayer[]
}

type Fetcher = typeof fetch

function assertPublicAssetUrl(url: string) {
  if (url.includes('?') || url.includes('#') || (!url.startsWith('/') && !/^https?:\/\//.test(url))) {
    throw new Error(`Public dataset manifest contains unsafe asset URL: ${url}`)
  }
}

// TotalSegmentator writes per-structure volumes (mm³) next to the case manifest.
// Turning them into ml lets the structure bar show real numbers instead of placeholders.
async function loadCaseVolumes(manifest: PublicManifest, fetcher: Fetcher): Promise<Record<string, number>> {
  const firstAsset = manifest.layers.flatMap(layer => Object.values(layer.assets)).find(Boolean)
  if (!firstAsset) return {}
  const directory = firstAsset.slice(0, firstAsset.lastIndexOf('/') + 1)
  if (!directory) return {}
  try {
    const response = await fetcher(`${directory}statistics.json`, { credentials: 'omit' })
    if (!response.ok) return {}
    const statistics = await response.json() as Record<string, { volume?: number }>
    const volumes: Record<string, number> = {}
    for (const [key, value] of Object.entries(statistics)) {
      if (typeof value?.volume === 'number') volumes[key.replace(/_/g, '-')] = value.volume / 1000
    }
    return volumes
  } catch {
    return {}
  }
}

export async function getPublicDatasetManifest(
  url: string,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<ViewerManifest> {
  const response = await fetcher(url, {
    signal,
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  })
  if (!response.ok) throw new Error(`Unable to load public dataset manifest (${response.status})`)
  const manifest = await response.json() as PublicManifest
  manifest.layers.forEach(layer => Object.values(layer.assets).forEach(asset => {
    if (asset) assertPublicAssetUrl(asset)
  }))
  const volumes = await loadCaseVolumes(manifest, fetcher)
  const firstAsset = manifest.layers.flatMap(layer => Object.values(layer.assets)).find(Boolean)
  const caseDirectory = firstAsset?.slice(0, firstAsset.lastIndexOf('/') + 1)
  return {
    resultId: `public-${manifest.caseId}`,
    title: manifest.title ?? `Public CT · ${manifest.caseId}`,
    renderStyle: manifest.renderStyle === 'clinical' ? 'clinical' : undefined,
    unit: manifest.unit,
    coordinateSystem: manifest.coordinateSystem,
    manifestVersion: 1,
    permissions: { view: true, measure: true, annotate: false, savePlan: false, download: false },
    layers: manifest.layers.map((layer, sortOrder) => ({
      ...layer,
      parentId: null,
      code: layer.id,
      volumeMl: volumes[layer.id] ?? null,
      sortOrder,
    })),
    volume: caseDirectory ? { descriptorUrl: `${caseDirectory}ct-volume.json` } : null,
  }
}
