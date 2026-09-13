import { ViewerIcon } from './ViewerIcon'

// Matches the reference rail: play/pause (auto rotation), move, and a "BG" text toggle.
export function QuickActionRail({ rotating, moving = false, onRotate, onMove, onRestore, onBackground }: { rotating: boolean; moving?: boolean; onRotate(): void; onMove(): void; onRestore?(): void; onBackground(): void }) {
  return <aside className="quick-rail" aria-label="快捷操作">
    <button className={`quick-rail__rotate${rotating ? ' is-active' : ''}`} aria-label={rotating ? '停止旋转' : '自动旋转'} aria-pressed={rotating} onClick={onRotate}><ViewerIcon name={rotating ? 'pause' : 'play'} size={18} /></button>
    <button className={`quick-rail__move${moving ? ' is-active' : ''}`} aria-label="移动模型" aria-pressed={moving} title="移动工具（也可直接拖动模型部位）" onClick={onMove}><ViewerIcon name="move" size={20} /></button>
    <button aria-label="恢复模型位置" title="恢复模型位置" onClick={onRestore}>↶</button>
    <button className="quick-rail__bg" aria-label="切换背景" onClick={onBackground}><span>BG</span></button>
  </aside>
}
