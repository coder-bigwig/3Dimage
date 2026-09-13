const referenceViewerUrl = import.meta.env.VITE_REFERENCE_VIEWER_URL as string | undefined

export function ReferenceViewerPage() {
  if (!referenceViewerUrl) {
    return (
      <main className="reference-viewer-state" aria-live="polite">
        <h1>参考医学查看器</h1>
        <p>请在本地环境变量 VITE_REFERENCE_VIEWER_URL 中配置带权限的参考链接。</p>
        <small>不会把访问 token 写入仓库或公开构建产物。</small>
      </main>
    )
  }

  return (
    <main className="reference-viewer-page" aria-label="参考医学查看器">
      <iframe
        className="reference-viewer-frame"
        src={referenceViewerUrl}
        title="参考医学三维查看器"
        allow="fullscreen"
      />
    </main>
  )
}
