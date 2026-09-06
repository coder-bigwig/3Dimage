import { toolbarDefinitions, type ToolbarAction } from './toolbarDefinitions'
import type { ViewerMode, ViewerTool } from './viewer.store'

const icons: Record<string, string> = { plan: '▤', reset: '↶', move: '✥', measure: '↗', annotation: '●', clip: '◫', new: '⚐+', undo: '↶', clear: '♲', closed: '⌯', length: '↔', diameter: '╱', close: '×' }

export function ContextToolbar({ mode, activeTool, onAction }: { mode: ViewerMode; activeTool: ViewerTool | null; onAction(action: ToolbarAction): void }) {
  return <nav className="context-toolbar" aria-label="查看器工具">
    {toolbarDefinitions[mode].map(action => <button key={action.id} className={activeTool === action.tool ? 'is-active' : ''} aria-label={action.label} onClick={() => onAction(action)}>
      <span aria-hidden="true">{icons[action.id] ?? '•'}</span><small>{action.label}</small>
    </button>)}
  </nav>
}
