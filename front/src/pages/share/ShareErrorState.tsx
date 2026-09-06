import type { SharedViewerApiError } from '../../api/sharedViewer'

interface ShareErrorStateProps {
  error: SharedViewerApiError
  onRetry: () => void
}

export function ShareErrorState({ error, onRetry }: ShareErrorStateProps) {
  const retryable = error.status >= 500 || error.status === 0
  return (
    <main className="share-state" aria-live="polite">
      <div className="share-state__card">
        <span className="share-state__icon" aria-hidden="true">!</span>
        <h1>{error.message}</h1>
        <p>
          {error.status === 410
            ? '请联系分享者获取新的链接。'
            : error.status === 404
              ? '请检查链接是否完整，或联系分享者。'
              : '请稍后重试。'}
        </p>
        {retryable && <button type="button" onClick={onRetry}>重新加载</button>}
        {error.requestId && <small>请求编号：{error.requestId}</small>}
      </div>
    </main>
  )
}
