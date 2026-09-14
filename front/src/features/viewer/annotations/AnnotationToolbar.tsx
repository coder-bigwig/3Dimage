import { useState } from 'react'
import { ColorPicker } from './ColorPicker'
import type { DrawingKind } from './types'
const colors = ['#ff0000', '#ffbf00', '#199cfa', '#13b019', '#4b4b4b', '#ffffff']
const tools: [DrawingKind, string, string][] = [['pen', '画笔', '∿'], ['line', '直线', '╱'], ['arrow', '箭头', '➚'], ['ellipse', '圆', '○'], ['rectangle', '矩形', '□'], ['text', '文字', 'Tₜ']]
function Icon({ name }: { name: 'palette' | 'tools' | 'undo' | 'send' }) {
  return <svg width="27" height="27" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'palette' && <><path d="M24 14c0 7-6 10-9 8-2-2 2-4-1-5-2-1-5 2-8 0C-2 11 9 1 17 5c4 1 7 4 7 9Z" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="8" r="1" /><circle cx="20" cy="12" r="1" /></>}
    {name === 'tools' && <><path d="M5 3h5v17l-2.5 5L5 20ZM5 18h5M7.5 5v10M16 3h7v22h-7ZM16 7h3M16 12h4M16 17h3M16 22h4" /></>}
    {name === 'undo' && <path d="m10 4-7 7 7 7M3 11h14c12 0 10 14-2 13H8" />}
    {name === 'send' && <><path d="m3 11 11-8 11 8v14H3ZM3 11l11 8 11-8M14 18V6m-4 4 4-4 4 4" /></>}
  </svg>
}
export function AnnotationToolbar({ mode, color, kind, text, selected, ready, onColor, onKind, onText, onDelete, onUndo, onClear, onClose }: {
  mode: '2d' | '3d'; color: string; kind: DrawingKind; text: string; selected: boolean; ready: boolean
  onColor(value: string): void; onKind(value: DrawingKind): void; onText(value: string): void
  onDelete(): void; onUndo(): void; onClear(): void; onClose(): void
}) {
  const [panel, setPanel] = useState<'colors' | 'tools'>('colors'), [help, setHelp] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  return <section className="annotation-toolbar" aria-label={mode === '2d' ? '二维标注工具' : '三维标注工具'}>
    <div className="annotation-toolbar-row">
      {mode === '2d' ? <>
        <div className="annotation-palette">{panel === 'colors' ? colors.map(value => <button key={value} aria-label={`颜色 ${value}`} aria-pressed={value === color} style={{ background: value }} onClick={() => onColor(value)} />) : tools.map(([value, label, icon]) => <button key={value} aria-label={label} aria-pressed={value === kind} onClick={() => onKind(value)}>{icon}</button>)}</div>
        <button aria-label="调色" aria-pressed={panel === 'colors'} onClick={() => { setPanel('colors'); setColorPickerOpen(true) }}><Icon name="palette" /><small>调色</small></button>
        <div className="annotation-custom-color" role="img" title="当前颜色" aria-label="当前颜色" style={{ background: color }} />
        <button aria-label="工具" aria-pressed={panel === 'tools'} onClick={() => setPanel('tools')}><Icon name="tools" /><small>工具</small></button>
        <button aria-label="撤销" disabled={!ready} onClick={onUndo}><Icon name="undo" /><small>撤销</small></button>
        <button aria-label="发送" disabled title="发送功能暂未开放"><Icon name="send" /><small>发送</small></button>
      </> : <>
        <input aria-label="标注文字" placeholder="输入文字后双击模型" maxLength={200} disabled={!ready} value={text} onChange={event => onText(event.target.value)} />
        <button disabled={!selected || !ready} onClick={onDelete}>删除</button>
        <button disabled={!ready} onClick={onUndo}>撤销</button>
      </>}
      <button disabled={!ready} onClick={onClear}>清空</button>
      <button onClick={onClose}>关闭</button>
    </div>
    {mode === '2d' && colorPickerOpen && <div className="annotation-color-picker-popover"><ColorPicker value={color} onCommit={value => { onColor(value); setColorPickerOpen(false) }} onCancel={() => setColorPickerOpen(false)} /></div>}
    {mode === '3d' && <p className="annotation-hint">☝ 双击模型标记，单击标记文本框修改或删除，长按可拖动 <button onClick={() => setHelp(true)}>更多</button></p>}
    {help && <div className="annotation-help-backdrop" onClick={() => setHelp(false)}><section role="dialog" aria-modal="true" aria-label="操作提示" className="annotation-help" onClick={event => event.stopPropagation()}><h3>操作提示</h3><p>☝ 双击模型表面添加标记</p><p>☝ 单击标记文本框，然后在上方修改或删除</p><p>☝ 长按标记文本框后拖动位置</p><p>拖动模型可旋转视角，标记始终跟随模型。</p><button autoFocus onClick={() => setHelp(false)}>知道了</button></section></div>}
  </section>
}
