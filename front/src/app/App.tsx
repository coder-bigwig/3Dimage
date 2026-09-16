import { Navigate, Route, Routes } from 'react-router-dom'
import { ShareViewerPage } from '../pages/share/ShareViewerPage'
import { ReferenceViewerPage } from '../pages/reference/ReferenceViewerPage'
import { PublicDatasetPage } from '../pages/public-data/PublicDatasetPage'

// 本地开发时把未知/根路径导向可用的公开 CT 模型，避免停在“模型资源未加载”的空态。
// 生产环境保持原有行为：未知路径进入分享错误页。
const fallbackPath = import.meta.env.DEV ? '/public-data' : '/share/invalid'

export function App() {
  return (
    <Routes>
      {import.meta.env.VITE_ENABLE_BLENDER_DEMO === 'true' && <Route path="/share/viewer" element={<ShareViewerPage fallbackToken="demo-blender-token-000000000000000000" />} />}
      <Route path="/share/:token" element={<ShareViewerPage />} />
      <Route path="/reference" element={<ReferenceViewerPage />} />
      <Route path="/public-data" element={<PublicDatasetPage />} />
      <Route path="*" element={<Navigate to={fallbackPath} replace />} />
    </Routes>
  )
}
