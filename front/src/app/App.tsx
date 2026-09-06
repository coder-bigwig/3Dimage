import { Navigate, Route, Routes } from 'react-router-dom'
import { ShareViewerPage } from '../pages/share/ShareViewerPage'

export function App() {
  return (
    <Routes>
      <Route path="/share/:token" element={<ShareViewerPage />} />
      <Route path="*" element={<Navigate to="/share/invalid" replace />} />
    </Routes>
  )
}
