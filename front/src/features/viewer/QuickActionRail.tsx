export function QuickActionRail({ rotating, onRotate, onReset, onBackground }: { rotating: boolean; onRotate(): void; onReset(): void; onBackground(): void }) {
  return <aside className="quick-rail" aria-label="快捷操作">
    <button aria-label={rotating ? '停止旋转' : '自动旋转'} onClick={onRotate}>{rotating ? 'Ⅱ' : '▶'}</button>
    <button className="quick-rail__move" aria-label="移动模型">✥</button>
    <button aria-label="恢复视角" onClick={onReset}>↶</button>
    <button aria-label="切换背景" onClick={onBackground}>BG</button>
  </aside>
}
