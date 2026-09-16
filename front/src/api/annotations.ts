import { SharedViewerApiError } from './sharedViewer'
import type { AnnotationContent, AnnotationDocument } from '../features/viewer/annotations/types'

const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
async function request(token: string, init?: RequestInit): Promise<AnnotationDocument> {
  const response = await fetch(`${base}/shared-viewers/${encodeURIComponent(token)}/annotations`, {
    ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new SharedViewerApiError(response.status, body.code ?? 'ANNOTATION_ERROR', body.message ?? '标注请求失败')
  }
  return response.json()
}
export const loadAnnotations = (token: string, signal?: AbortSignal) => request(token, { signal })
export const saveAnnotations = (token: string, version: number, content: AnnotationContent) =>
  request(token, { method: 'PUT', body: JSON.stringify({ ...content, version }) })
