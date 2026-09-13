import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CtVolume } from './ctVolume'
import { ctOrientationLabels, readSlice, slicePlane, type CtOrientation } from './ctSlice'
import { renderSliceToGray } from './ctWindow'
import { applyLut, type CtLutName } from './ctLut'
import { applyWindowDrag, type CtWindowState } from './ctPresets'
import { computeCellTransform, formatMeasure, measureValue, screenToSlice, sliceToScreen, type CellTransform, type CtMeasure, type CtMeasureKind, type CtMeasurePoint, type CtTextAnnotation } from './ctMeasure'

export type CtToolMode = 'window' | 'page' | 'pan' | 'zoom' | 'measure' | 'mark'

export interface CtCellProps {
  volume: CtVolume
  orientation: CtOrientation
  index: number
  onIndexChange(index: number): void
  window: CtWindowState
  onWindowChange(next: CtWindowState): void
  lut: CtLutName
  mode: CtToolMode
  measureKind: CtMeasureKind
  showOverlay: boolean
  measurements: CtMeasure[]
  annotations: CtTextAnnotation[]
  onAddMeasurement(record: Omit<CtMeasure, 'id'>): void
  onAddAnnotation(record: Omit<CtTextAnnotation, 'id'>): void
}

interface PendingMeasure { plane: CtOrientation; sliceIndex: number; kind: CtMeasureKind; points: CtMeasurePoint[] }
interface DraftAnnotation extends CtMeasurePoint { plane: CtOrientation; sliceIndex: number; x: number; y: number }

export function CtCell({ volume, orientation, index, onIndexChange, window: windowState, onWindowChange, lut, mode, measureKind, showOverlay, measurements, annotations, onAddMeasurement, onAddAnnotation }: CtCellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const sliceBufferRef = useRef<Int16Array | null>(null)
  const grayBufferRef = useRef<Uint8ClampedArray | null>(null)
  const rgbaBufferRef = useRef<Uint8ClampedArray | null>(null)
  const transformRef = useRef<CellTransform>({ dx: 0, dy: 0, scaleU: 1, scaleV: 1 })
  const ratioRef = useRef(1)
  const draftSubmittedRef = useRef(false)
  const hoverRef = useRef<CtMeasurePoint | null>(null)
  const lastAreaClickRef = useRef(0)
  const lastAreaPointRef = useRef<CtMeasurePoint | null>(null)
  const dragRef = useRef<{ x: number; y: number; index: number; window: CtWindowState; panX: number; panY: number; zoom: number } | null>(null)

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [pending, setPending] = useState<PendingMeasure | null>(null)
  const [draft, setDraft] = useState<DraftAnnotation | null>(null)

  const plane = slicePlane(volume, orientation)
  const measuring = mode === 'measure'
  const marking = mode === 'mark'
  // A pending measure carries its own plane/slice/kind, so scrolling or switching
  // tools simply deactivates it instead of teleporting it onto another slice.
  const activePending = pending && pending.plane === orientation && pending.sliceIndex === index && pending.kind === measureKind && measuring ? pending : null
  const activeDraft = draft && draft.plane === orientation && draft.sliceIndex === index && marking ? draft : null

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const measure = () => setSize({ width: container.clientWidth, height: container.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || size.width === 0 || size.height === 0) return

    const { rows, columns, rowSpacing, columnSpacing } = plane
    const count = rows * columns
    if (!sliceBufferRef.current || sliceBufferRef.current.length !== count) sliceBufferRef.current = new Int16Array(count)
    if (!grayBufferRef.current || grayBufferRef.current.length !== count) grayBufferRef.current = new Uint8ClampedArray(count)
    if (!rgbaBufferRef.current || rgbaBufferRef.current.length !== count * 4) rgbaBufferRef.current = new Uint8ClampedArray(count * 4)

    readSlice(volume, orientation, index, sliceBufferRef.current)
    renderSliceToGray(sliceBufferRef.current, windowState.center, windowState.width, grayBufferRef.current)
    applyLut(grayBufferRef.current, lut, rgbaBufferRef.current)

    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas')
    const offscreen = offscreenRef.current
    offscreen.width = columns
    offscreen.height = rows
    const offscreenContext = offscreen.getContext('2d')
    if (!offscreenContext) return
    const image = offscreenContext.createImageData(columns, rows)
    image.data.set(rgbaBufferRef.current)
    offscreenContext.putImageData(image, 0, 0)

    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    ratioRef.current = ratio
    canvas.width = Math.round(size.width * ratio)
    canvas.height = Math.round(size.height * ratio)
    context.fillStyle = '#000'
    context.fillRect(0, 0, canvas.width, canvas.height)

    const transform = computeCellTransform({
      canvasWidth: canvas.width, canvasHeight: canvas.height,
      columns, rows, columnSpacing, rowSpacing,
      zoom, panX: pan.x * ratio, panY: pan.y * ratio,
    })
    transformRef.current = transform

    context.imageSmoothingEnabled = false
    context.drawImage(offscreen, 0, 0, columns, rows, transform.dx, transform.dy, columns * transform.scaleU, rows * transform.scaleV)

    context.font = `${12 * ratio}px Arial, sans-serif`
    context.lineWidth = 1.6 * ratio
    context.textBaseline = 'middle'

    const label = (x: number, y: number, text: string) => {
      const width = context.measureText(text).width + 8 * ratio
      context.fillStyle = 'rgba(0, 0, 0, .72)'
      context.fillRect(x - 4 * ratio, y - 9 * ratio, width, 18 * ratio)
      context.fillStyle = '#ffe14d'
      context.fillText(text, x, y)
    }
    const marker = (u: number, v: number, color: string) => {
      const { x, y } = sliceToScreen(transform, u, v)
      context.fillStyle = color
      context.beginPath()
      context.arc(x, y, 3 * ratio, 0, Math.PI * 2)
      context.fill()
      return { x, y }
    }
    const polyline = (points: CtMeasurePoint[]) => {
      context.beginPath()
      context.moveTo(transform.dx + points[0].u * transform.scaleU, transform.dy + points[0].v * transform.scaleV)
      for (let i = 1; i < points.length; i += 1) context.lineTo(transform.dx + points[i].u * transform.scaleU, transform.dy + points[i].v * transform.scaleV)
    }

    context.strokeStyle = '#ffe14d'
    for (const measurement of measurements) {
      const points = measurement.points
      if (measurement.kind === 'area') {
        polyline(points)
        context.closePath()
        context.stroke()
        let cx = 0, cy = 0
        for (const point of points) { cx += point.u; cy += point.v }
        cx /= points.length; cy /= points.length
        const { x, y } = sliceToScreen(transform, cx, cy)
        label(x, y, formatMeasure('area', measurement.value))
      } else if (measurement.kind === 'angle') {
        const vertex = sliceToScreen(transform, points[0].u, points[0].v)
        context.beginPath()
        context.moveTo(vertex.x, vertex.y)
        context.lineTo(transform.dx + points[1].u * transform.scaleU, transform.dy + points[1].v * transform.scaleV)
        context.moveTo(vertex.x, vertex.y)
        context.lineTo(transform.dx + points[2].u * transform.scaleU, transform.dy + points[2].v * transform.scaleV)
        context.stroke()
        label(vertex.x, vertex.y + 16 * ratio, formatMeasure('angle', measurement.value))
        points.forEach(point => marker(point.u, point.v, '#ff5f56'))
      } else {
        const from = sliceToScreen(transform, points[0].u, points[0].v)
        const to = sliceToScreen(transform, points[1].u, points[1].v)
        context.beginPath()
        context.moveTo(from.x, from.y)
        context.lineTo(to.x, to.y)
        context.stroke()
        if (measurement.kind === 'diameter') {
          const radius = Math.hypot(to.x - from.x, to.y - from.y) / 2
          context.beginPath()
          context.arc((from.x + to.x) / 2, (from.y + to.y) / 2, radius, 0, Math.PI * 2)
          context.stroke()
        }
        marker(points[0].u, points[0].v, '#ff5f56')
        marker(points[1].u, points[1].v, '#ff5f56')
        label((from.x + to.x) / 2, (from.y + to.y) / 2 - 12 * ratio, formatMeasure(measurement.kind, measurement.value))
      }
    }

    for (const annotation of annotations) {
      const { x, y } = marker(annotation.u, annotation.v, '#6ee7a8')
      context.fillStyle = '#6ee7a8'
      context.fillText(annotation.text || '标注', x + 8 * ratio, y)
    }

    const hover = hoverRef.current
    if (activePending && hover) {
      context.strokeStyle = '#ffd166'
      context.setLineDash([5 * ratio, 4 * ratio])
      const preview = [...activePending.points, hover]
      if (measureKind === 'area') {
        polyline(activePending.points)
        context.lineTo(transform.dx + hover.u * transform.scaleU, transform.dy + hover.v * transform.scaleV)
        context.stroke()
      } else if (measureKind === 'angle') {
        const vertex = sliceToScreen(transform, activePending.points[0].u, activePending.points[0].v)
        const last = activePending.points.length > 1 ? activePending.points[1] : null
        context.beginPath()
        context.moveTo(vertex.x, vertex.y)
        context.lineTo(transform.dx + hover.u * transform.scaleU, transform.dy + hover.v * transform.scaleV)
        if (last) { context.moveTo(vertex.x, vertex.y); context.lineTo(transform.dx + last.u * transform.scaleU, transform.dy + last.v * transform.scaleV) }
        context.stroke()
      } else {
        const from = sliceToScreen(transform, activePending.points[0].u, activePending.points[0].v)
        context.beginPath()
        context.moveTo(from.x, from.y)
        context.lineTo(transform.dx + hover.u * transform.scaleU, transform.dy + hover.v * transform.scaleV)
        context.stroke()
      }
      context.setLineDash([])
      const hasEnoughPoints = measureKind === 'area' ? preview.length >= 3 : measureKind === 'angle' ? preview.length >= 3 : preview.length >= 2
      if (hasEnoughPoints) {
        const value = measureValue(measureKind, preview, columnSpacing, rowSpacing)
        const from = sliceToScreen(transform, activePending.points[0].u, activePending.points[0].v)
        label(from.x + 12 * ratio, from.y - 12 * ratio, formatMeasure(measureKind, value))
      }
    }
  }, [activePending, annotations, index, lut, measureKind, measurements, orientation, pan.x, pan.y, plane, size.height, size.width, volume, windowState.center, windowState.width, zoom])

  useLayoutEffect(() => { draw() }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const step = event.deltaY > 0 ? 1 : -1
      onIndexChange(Math.min(Math.max(index + step, 0), plane.count - 1))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [index, onIndexChange, plane.count])

  const toScreenPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ratio = ratioRef.current
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toScreenPoint(event)
    const slicePoint = screenToSlice(transformRef.current, point.x, point.y)

    if (measuring) {
      if (!activePending) {
        setPending({ plane: orientation, sliceIndex: index, kind: measureKind, points: [slicePoint] })
        hoverRef.current = slicePoint
        return
      }
      const committed = (points: CtMeasurePoint[]) => onAddMeasurement({
        plane: orientation, sliceIndex: index, kind: activePending.kind, points,
        value: measureValue(activePending.kind, points, plane.columnSpacing, plane.rowSpacing),
      })
      const kind = activePending.kind
      if (kind === 'length' || kind === 'diameter') {
        committed([...activePending.points, slicePoint])
        setPending(null); hoverRef.current = null
        return
      }
      if (kind === 'angle') {
        const points = [...activePending.points, slicePoint]
        if (points.length >= 3) { committed(points); setPending(null); hoverRef.current = null }
        else setPending({ ...activePending, points })
        return
      }
      // area: close by clicking back near the first point, or double-clicking a spot
      const first = activePending.points[0]
      const nearFirst = Math.hypot(slicePoint.u - first.u, slicePoint.v - first.v) < 10
      const previous = lastAreaPointRef.current
      const sameSpot = previous !== null && Math.hypot(slicePoint.u - previous.u, slicePoint.v - previous.v) < 4
      const doubleClick = sameSpot && Date.now() - lastAreaClickRef.current < 400
      lastAreaPointRef.current = slicePoint
      lastAreaClickRef.current = Date.now()
      if ((nearFirst || doubleClick) && activePending.points.length >= 3) {
        committed(activePending.points)
        setPending(null); hoverRef.current = null
        return
      }
      setPending({ ...activePending, points: [...activePending.points, slicePoint] })
      return
    }

    if (marking) {
      event.preventDefault()
      draftSubmittedRef.current = false
      setDraft({ plane: orientation, sliceIndex: index, u: slicePoint.u, v: slicePoint.v, x: point.x / ratioRef.current, y: point.y / ratioRef.current })
      return
    }

    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* jsdom */ }
    dragRef.current = { x: event.clientX, y: event.clientY, index, window: windowState, panX: pan.x, panY: pan.y, zoom }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (measuring) {
      const point = toScreenPoint(event)
      const slicePoint = screenToSlice(transformRef.current, point.x, point.y)
      hoverRef.current = slicePoint
      if (activePending) draw()
      return
    }
    if (marking) return
    const drag = dragRef.current
    if (!drag) return
    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    if (mode === 'window') onWindowChange(applyWindowDrag(drag.window, deltaX, deltaY))
    else if (mode === 'page') onIndexChange(Math.min(Math.max(drag.index + Math.round(deltaY / 10), 0), plane.count - 1))
    else if (mode === 'pan') setPan({ x: drag.panX + deltaX, y: drag.panY + deltaY })
    else setZoom(Math.min(Math.max(drag.zoom * Math.exp(-deltaY / 220), 0.2), 12))
  }

  const endDrag = () => { dragRef.current = null }

  const submitDraft = (text: string) => {
    if (!activeDraft || draftSubmittedRef.current) return
    draftSubmittedRef.current = true
    if (text.trim()) onAddAnnotation({ plane: orientation, sliceIndex: index, u: activeDraft.u, v: activeDraft.v, text: text.trim() })
    setDraft(null)
  }

  const cancelDraft = () => { draftSubmittedRef.current = true; setDraft(null) }

  return <div className={`ct-cell${measuring || marking ? ' ct-cell--drawing' : ''}`} ref={containerRef} data-testid={`ct-cell-${orientation}`}>
    <canvas
      ref={canvasRef}
      className="ct-cell__canvas"
      aria-label={`${ctOrientationLabels[orientation]} 第 ${index + 1} 张`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
    {showOverlay && <div className="ct-overlay" aria-hidden="true">
      <div className="ct-overlay__corner ct-overlay__corner--tl">
        <span>{volume.descriptor.meta?.caseId ?? volume.descriptor.caseId}</span>
        <span>演示数据</span>
      </div>
      <div className="ct-overlay__corner ct-overlay__corner--bl">
        <span>{volume.descriptor.meta?.seriesName ?? 'CT'}</span>
        <span>层厚 {volume.descriptor.meta?.sliceThicknessMm ?? volume.spacing[2]}mm</span>
      </div>
      <div className="ct-overlay__corner ct-overlay__corner--tr">
        <span>{ctOrientationLabels[orientation]}</span>
        <span>缩放 {Math.round(zoom * 100)}%</span>
      </div>
      <div className="ct-overlay__corner ct-overlay__corner--br">
        <span>{index + 1}/{plane.count}</span>
        <span>W{windowState.width} C{windowState.center}</span>
      </div>
    </div>}
    {activeDraft && <div className="ct-annotate" style={{ left: Math.max(activeDraft.x - 60, 4), top: Math.max(activeDraft.y - 34, 4) }}>
      <input
        autoFocus
        aria-label="标注文字"
        placeholder="输入标注文字"
        defaultValue=""
        onKeyDown={event => {
          if (event.key === 'Enter') submitDraft((event.target as HTMLInputElement).value)
          if (event.key === 'Escape') cancelDraft()
        }}
        onBlur={event => { if (event.target.value.trim()) submitDraft(event.target.value) }}
      />
    </div>}
  </div>
}
