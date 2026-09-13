export interface ViewerPermissions {
  view: boolean
  measure: boolean
  annotate: boolean
  savePlan: boolean
  download: boolean
}

export interface ManifestLayer {
  id: string
  parentId: string | null
  code: string
  name: string
  color: string
  opacity: number
  visible: boolean
  volumeMl: number | null
  sortOrder: number
  assets: Partial<Record<'low' | 'medium' | 'high' | 'canonical', string>>
}

export interface ViewerVolumeSource {
  /** URL of the ct-volume.json descriptor; the int16 payload sits beside it. */
  descriptorUrl: string
}

export interface ViewerManifest {
  renderStyle?: 'clinical'
  resultId: string
  title: string
  unit: 'mm'
  coordinateSystem: 'LPS' | 'RAS'
  manifestVersion: number
  permissions: ViewerPermissions
  layers: ManifestLayer[]
  /** Present when the case ships a 2D CT volume; absent for model-only results. */
  volume?: ViewerVolumeSource | null
}

interface ApiErrorBody {
  code?: string
  message?: string
  requestId?: string
}

export class SharedViewerApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message)
    this.name = 'SharedViewerApiError'
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

export async function getSharedViewerManifest(token: string, signal?: AbortSignal): Promise<ViewerManifest> {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) {
    throw new SharedViewerApiError(422, 'INVALID_SHARE_TOKEN', '分享链接格式无效')
  }
  const response = await fetch(
    `${apiBaseUrl}/shared-viewers/${encodeURIComponent(token)}/manifest`,
    { signal, headers: { Accept: 'application/json' } },
  )
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new SharedViewerApiError(
      response.status,
      body.code ?? 'VIEWER_REQUEST_FAILED',
      body.message ?? '暂时无法打开三维结果',
      body.requestId,
    )
  }
  return (await response.json()) as ViewerManifest
}
