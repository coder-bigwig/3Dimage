import { ViewerIcon } from './ViewerIcon'

export function PlanDrawer({ open, onClose }: { open: boolean; onClose(): void }) {
  if (!open) return null
  return <aside className="plan-drawer" aria-label="方案管理"><header><div><span className="panel-kicker">工作区配置</span><h2>查看方案</h2></div><button className="panel-close" aria-label="关闭方案面板" onClick={onClose}><ViewerIcon name="close" size={22} /></button></header><div className="plan-empty"><div className="plan-empty-icon"><ViewerIcon name="plan" size={27} /></div><strong>还没有保存的方案</strong><p>保存当前视角、分层显隐、颜色和测量结果，方便下次继续查看。</p></div><button className="primary" disabled>保存新方案<span>数据功能待接入</span></button></aside>
}
