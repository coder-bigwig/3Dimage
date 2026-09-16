import { toolbarDefinitions, type ToolbarAction } from './toolbarDefinitions'
import type { ViewerMode, ViewerTool } from './viewer.store'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ViewerIcon, type ViewerIconName } from './ViewerIcon'

const toolbarIconNames = new Set<ViewerIconName>(['reset', 'segment', 'plan', 'annotation', 'measure', 'view', 'new', 'undo', 'clear', 'closed', 'angle', 'finish', 'length', 'diameter', 'close'])

export const viewerViews = ['三维', '影像', '三维+横断面', '冠状面', '矢状面', '三维+冠状面', '三维+矢状面', '三维+AR', '裁剪框'] as const
export type ViewerView = typeof viewerViews[number]

export function ContextToolbar({ mode, activeTool, onAction, viewMenuOpen = false, activeView = '三维', onSelectView, canSavePlan = true, canAnnotate = true, onAnnotate }: { mode: ViewerMode; activeTool: ViewerTool | null; onAction(action: ToolbarAction): void; viewMenuOpen?: boolean; activeView?: ViewerView; onSelectView?(view: ViewerView): void; canSavePlan?: boolean; canAnnotate?: boolean; onAnnotate?(mode: '2d' | '3d'): void }) {
  const [annotationMenu, setAnnotationMenu] = useState(false)
  const [annotationPosition, setAnnotationPosition] = useState({ top: 0, left: 0 })
  const viewButtonRef = useRef<HTMLButtonElement>(null)
  const toolbarRef = useRef<HTMLElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  useEffect(() => {
    if (!annotationMenu) return
    const close = (event: PointerEvent) => { if (!toolbarRef.current?.contains(event.target as Node)) setAnnotationMenu(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setAnnotationMenu(false) }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [annotationMenu])

  useLayoutEffect(() => {
    if (!viewMenuOpen || !viewButtonRef.current) return
    const rect = viewButtonRef.current.getBoundingClientRect()
    const width = 210
    setMenuPosition({
      top: rect.bottom,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    })
  }, [viewMenuOpen])

  useEffect(() => {
    if (!viewMenuOpen) return
    const onPointerDown = (event: PointerEvent) => { if (!toolbarRef.current?.contains(event.target as Node)) onSelectView?.(activeView) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onSelectView?.(activeView) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [activeView, onSelectView, viewMenuOpen])

  return <nav ref={toolbarRef} className="context-toolbar" aria-label="查看器工具">
    {toolbarDefinitions[mode].map(action => <span className="context-toolbar__item" key={action.id}>
      <button ref={action.command === 'view' ? viewButtonRef : undefined} disabled={(action.command === 'plan' && !canSavePlan) || (action.tool === 'annotation' && !canAnnotate)} className={`${activeTool === action.tool || (action.command === 'view' && viewMenuOpen) ? 'is-active' : ''}`} aria-label={action.command === 'view' && activeView !== '三维' ? `视图：${activeView}` : action.label} aria-expanded={action.tool === 'annotation' ? annotationMenu : action.command === 'view' ? viewMenuOpen : undefined} onClick={event => {
        if (action.tool === 'annotation' && onAnnotate) {
          const rect = event.currentTarget.getBoundingClientRect()
          setAnnotationPosition({ top: rect.bottom, left: Math.min(rect.left, window.innerWidth - 130) }); setAnnotationMenu(value => !value)
        } else { setAnnotationMenu(false); onAction(action) }
      }}>
      <ViewerIcon name={(toolbarIconNames.has(action.id as ViewerIconName) ? action.id : 'view') as ViewerIconName} size={24} /><small>{action.label}</small>
      </button>
      {action.tool === 'annotation' && annotationMenu && <div className="viewer-menu annotation-menu" role="menu" aria-label="标注模式" style={annotationPosition}>
        <button role="menuitem" onClick={() => { setAnnotationMenu(false); onAnnotate?.('2d') }}>二维标注</button>
        <button role="menuitem" onClick={() => { setAnnotationMenu(false); onAnnotate?.('3d') }}>三维标注</button>
      </div>}
      {action.command === 'view' && viewMenuOpen && <div className="viewer-menu" style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : undefined} role="menu" aria-label="视图模式">
        {viewerViews.map(view => <button type="button" role="menuitem" aria-pressed={view === activeView} className={view === activeView ? 'is-selected' : ''} key={view} onClick={() => onSelectView?.(view)}>{view}</button>)}
      </div>}
    </span>)}
  </nav>
}
