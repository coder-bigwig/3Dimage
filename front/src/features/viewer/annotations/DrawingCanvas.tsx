import { useRef, useState } from 'react'
import { createUuid } from '../../../../packages/rendering-core/src/utils/createUuid'
import type { Drawing, DrawingKind, Point2 } from './types'

function Shape({ drawing }: { drawing: Drawing }) {
  const points = drawing.points.map(p => ({ x: p.x * 1000, y: p.y * 1000 }))
  const a = points[0], b = points[points.length - 1]
  const attrs = { stroke: drawing.color, strokeWidth: 3, fill: 'none', vectorEffect: 'non-scaling-stroke' as const }
  if (drawing.kind === 'text') return <text x={a.x} y={a.y} fill={drawing.color} fontSize="28" fontFamily="sans-serif">{drawing.text}</text>
  if (drawing.kind === 'rectangle') return <rect {...attrs} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} />
  if (drawing.kind === 'ellipse') return <ellipse {...attrs} cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} rx={Math.abs(b.x - a.x) / 2} ry={Math.abs(b.y - a.y) / 2} />
  return <g>
    {drawing.kind === 'arrow' && <defs><marker id={`arrow-${drawing.id}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill={drawing.color} /></marker></defs>}
    <polyline {...attrs} strokeLinecap="round" strokeLinejoin="round" points={points.map(p => `${p.x},${p.y}`).join(' ')} markerEnd={drawing.kind === 'arrow' ? `url(#arrow-${drawing.id})` : undefined} />
  </g>
}

export function DrawingCanvas({ drawings, kind, color, enabled, onAdd }: { drawings: Drawing[]; kind: DrawingKind; color: string; enabled: boolean; onAdd(drawing: Drawing): void }) {
  const draftRef = useRef<Drawing | null>(null), pointer = useRef<number | null>(null)
  const [draft, setDraft] = useState<Drawing | null>(null)
  const [entry, setEntry] = useState<{ point: Point2; text: string } | null>(null)
  const update = (value: Drawing | null) => { draftRef.current = value; setDraft(value) }
  const locate = (event: React.PointerEvent<SVGSVGElement>): Point2 => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }
  }
  const finishText = () => {
    if (!entry?.text.trim()) return
    onAdd({ id: createUuid(), kind: 'text', color, points: [entry.point], text: entry.text.trim() }); setEntry(null)
  }
  return <div className="drawing-overlay">
    <svg aria-label="二维标注画布" viewBox="0 0 1000 1000" preserveAspectRatio="none" className="drawing-surface"
      onPointerDown={event => {
        if (!enabled || event.button !== 0 || pointer.current !== null || entry) return
        const point = locate(event)
        if (kind === 'text') { setEntry({ point, text: '' }); return }
        pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId)
        update({ id: createUuid(), kind, color, points: [point, point], text: '' })
      }} onPointerMove={event => {
        const current = draftRef.current
        if (!current || pointer.current !== event.pointerId) return
        const point = locate(event)
        update({ ...current, points: kind === 'pen' ? [...current.points.slice(0, 1999), point] : [current.points[0], point] })
      }} onPointerUp={event => {
        if (pointer.current !== event.pointerId) return
        const current = draftRef.current
        pointer.current = null
        if (current) {
          const points = current.kind === 'pen' ? [...current.points.slice(0, 1999), locate(event)] : [current.points[0], locate(event)]
          if (points.some(p => Math.hypot(p.x - points[0].x, p.y - points[0].y) > .001)) onAdd({ ...current, points })
        }
        update(null)
      }} onPointerCancel={() => { pointer.current = null; update(null) }}>
      {drawings.map(drawing => <Shape key={drawing.id} drawing={drawing} />)}
      {draft && <Shape drawing={draft} />}
    </svg>
    {entry && <form className="drawing-text-entry" style={{ left: `${Math.min(entry.point.x * 100, 55)}%`, top: `${Math.min(entry.point.y * 100, 80)}%` }} onSubmit={event => { event.preventDefault(); finishText() }}>
      <input autoFocus aria-label="二维标注文字" maxLength={200} value={entry.text} onChange={event => setEntry({ ...entry, text: event.target.value })} onKeyDown={event => { if (event.key === 'Escape') setEntry(null) }} />
      <button disabled={!entry.text.trim()} type="submit">确定</button><button type="button" onClick={() => setEntry(null)}>取消</button>
    </form>}
  </div>
}
