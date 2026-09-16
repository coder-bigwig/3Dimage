import type { ViewerMode, ViewerTool } from './viewer.store'

export interface ToolbarAction {
  id: string
  label: string
  tool?: ViewerTool
  command?: 'new' | 'undo' | 'clear' | 'finish' | 'close' | 'plan' | 'reset' | 'view' | 'screenshot'
}

export const toolbarDefinitions: Readonly<Record<ViewerMode, readonly ToolbarAction[]>> = {
  browse: [
    { id: 'reset', label: '重置', command: 'reset' },
    { id: 'segment', label: '分段', tool: 'moveLayer' },
    { id: 'plan', label: '方案', command: 'plan' },
    { id: 'annotation', label: '标注', tool: 'annotation' },
    { id: 'measure', label: '测量', tool: 'length' },
    { id: 'view', label: '视图', command: 'view' },
  ],
  measure: [
    { id: 'new', label: '新建', command: 'new' }, { id: 'undo', label: '撤销', command: 'undo' },
    { id: 'clear', label: '清空', command: 'clear' }, { id: 'angle', label: '角度', tool: 'angle' },
    { id: 'closed', label: '面积', tool: 'closedArea' }, { id: 'finish', label: '完成', command: 'finish' },
    { id: 'length', label: '长度', tool: 'length' }, { id: 'diameter', label: '直径', tool: 'diameter' },
    { id: 'close', label: '关闭', command: 'close' },
  ],
  annotate: [
    { id: 'new', label: '新建', command: 'new' }, { id: 'undo', label: '撤销', command: 'undo' },
    { id: 'clear', label: '清空', command: 'clear' }, { id: 'annotation', label: '标注', tool: 'annotation' },
    { id: 'close', label: '关闭', command: 'close' },
  ],
  moveLayer: [
    { id: 'undo', label: '撤销', command: 'undo' }, { id: 'reset', label: '复位', command: 'reset' },
    { id: 'move', label: '移动', tool: 'moveLayer' }, { id: 'close', label: '关闭', command: 'close' },
  ],
  clip: [
    { id: 'new', label: '新建', command: 'new' }, { id: 'undo', label: '撤销', command: 'undo' },
    { id: 'clear', label: '清空', command: 'clear' }, { id: 'clip', label: '剖切', tool: 'clipPlane' },
    { id: 'close', label: '关闭', command: 'close' },
  ],
}
