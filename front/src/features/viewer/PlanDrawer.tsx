export function PlanDrawer({ open, onClose }: { open: boolean; onClose(): void }) {
  if (!open) return null
  return <aside className="plan-drawer" aria-label="方案管理"><header><h2>查看方案</h2><button onClick={onClose}>×</button></header><p>保存当前视角、分层显隐、颜色和测量结果。</p><button className="primary">保存新方案</button></aside>
}
