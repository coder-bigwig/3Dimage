import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  SharedViewerApiError,
  getSharedViewerManifest,
} from '../../api/sharedViewer'
import { ShareErrorState } from './ShareErrorState'

function redactBrowserAddress() {
  if (window.location.pathname.startsWith('/share/') && window.location.pathname !== '/share/viewer') {
    window.history.replaceState(window.history.state, '', '/share/viewer')
  }
}

export function ShareViewerPage() {
  const { token = '' } = useParams()
  const manifestQuery = useQuery({
    queryKey: ['shared-viewer-manifest'],
    queryFn: ({ signal }) => getSharedViewerManifest(token, signal),
    retry: (count, error) => error instanceof SharedViewerApiError && error.status >= 500 && count < 2,
  })

  useEffect(() => {
    if (manifestQuery.isSuccess || manifestQuery.isError) redactBrowserAddress()
  }, [manifestQuery.isError, manifestQuery.isSuccess])

  if (manifestQuery.isPending) {
    return (
      <main className="share-state" aria-live="polite">
        <div className="share-state__card">
          <span className="share-state__loader" aria-hidden="true" />
          <h1>正在加载三维结果</h1>
          <p>首次加载复杂模型可能需要一点时间。</p>
        </div>
      </main>
    )
  }

  if (manifestQuery.isError) {
    const error = manifestQuery.error instanceof SharedViewerApiError
      ? manifestQuery.error
      : new SharedViewerApiError(0, 'NETWORK_ERROR', '网络连接失败')
    return <ShareErrorState error={error} onRetry={() => void manifestQuery.refetch()} />
  }

  return (
    <main className="viewer-placeholder" aria-label={manifestQuery.data.title}>
      <header>
        <h1>{manifestQuery.data.title}</h1>
        <span>{manifestQuery.data.coordinateSystem} · {manifestQuery.data.unit}</span>
      </header>
      <div className="viewer-placeholder__canvas" data-testid="viewer-canvas">
        3D 查看器正在初始化
      </div>
    </main>
  )
}
