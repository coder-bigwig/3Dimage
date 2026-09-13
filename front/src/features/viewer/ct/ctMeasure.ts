/** Measurement records, geometry, and the slice/screen transform shared by rendering and picking. */

import type { CtOrientation } from './ctSlice'

export type CtMeasureKind = 'length' | 'diameter' | 'angle' | 'area'

export interface CtMeasurePoint { u: number; v: number }

export interface CtMeasure {
  id: number
  plane: CtOrientation
  sliceIndex: number
  kind: CtMeasureKind
  /** In slice pixels: length/diameter use 2, angle uses 3 (first point is the vertex), area uses 3+. */
  points: CtMeasurePoint[]
  /** Already resolved: millimetres, degrees, or square millimetres. */
  value: number
}

export interface CtTextAnnotation {
  id: number
  plane: CtOrientation
  sliceIndex: number
  u: number
  v: number
  text: string
}

export interface CellTransform {
  dx: number
  dy: number
  scaleU: number
  scaleV: number
}

export interface CellTransformInput {
  canvasWidth: number
  canvasHeight: number
  columns: number
  rows: number
  columnSpacing: number
  rowSpacing: number
  zoom: number
  panX: number
  panY: number
}

/** Fit by physical extent so anisotropic voxels are not stretched, then apply zoom and pan. */
export function computeCellTransform(input: CellTransformInput): CellTransform {
  const { canvasWidth, canvasHeight, columns, rows, columnSpacing, rowSpacing, zoom, panX, panY } = input
  if (canvasWidth <= 0 || canvasHeight <= 0 || columns <= 0 || rows <= 0) return { dx: 0, dy: 0, scaleU: 0, scaleV: 0 }
  const physicalWidth = columns * columnSpacing
  const physicalHeight = rows * rowSpacing
  const baseScale = Math.min(canvasWidth / physicalWidth, canvasHeight / physicalHeight)
  const drawWidth = physicalWidth * baseScale * zoom
  const drawHeight = physicalHeight * baseScale * zoom
  return {
    dx: (canvasWidth - drawWidth) / 2 + panX,
    dy: (canvasHeight - drawHeight) / 2 + panY,
    scaleU: drawWidth / columns,
    scaleV: drawHeight / rows,
  }
}

export function screenToSlice(transform: CellTransform, x: number, y: number): { u: number; v: number } {
  if (transform.scaleU === 0 || transform.scaleV === 0) return { u: x, v: y }
  return { u: (x - transform.dx) / transform.scaleU, v: (y - transform.dy) / transform.scaleV }
}

export function sliceToScreen(transform: CellTransform, u: number, v: number): { x: number; y: number } {
  return { x: transform.dx + u * transform.scaleU, y: transform.dy + v * transform.scaleV }
}

export function distanceMm(u1: number, v1: number, u2: number, v2: number, columnSpacing: number, rowSpacing: number): number {
  return Math.hypot((u2 - u1) * columnSpacing, (v2 - v1) * rowSpacing)
}

function physical(point: CtMeasurePoint, columnSpacing: number, rowSpacing: number): { x: number; y: number } {
  return { x: point.u * columnSpacing, y: point.v * rowSpacing }
}

export function polygonAreaMm2(points: CtMeasurePoint[], columnSpacing: number, rowSpacing: number): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = physical(points[index], columnSpacing, rowSpacing)
    const next = physical(points[(index + 1) % points.length], columnSpacing, rowSpacing)
    sum += current.x * next.y - next.x * current.y
  }
  return Math.abs(sum) / 2
}

export function angleDegrees(points: CtMeasurePoint[], columnSpacing: number, rowSpacing: number): number {
  // First point is the vertex; the next two are the arm endpoints.
  const vertex = physical(points[0], columnSpacing, rowSpacing)
  const first = physical(points[1], columnSpacing, rowSpacing)
  const second = physical(points[2], columnSpacing, rowSpacing)
  const a = { x: first.x - vertex.x, y: first.y - vertex.y }
  const b = { x: second.x - vertex.x, y: second.y - vertex.y }
  const magnitude = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y)
  if (magnitude === 0) return 0
  const cosine = Math.min(Math.max((a.x * b.x + a.y * b.y) / magnitude, -1), 1)
  return Math.acos(cosine) * 180 / Math.PI
}

export function measureValue(kind: CtMeasureKind, points: CtMeasurePoint[], columnSpacing: number, rowSpacing: number): number {
  if (kind === 'angle') return angleDegrees(points, columnSpacing, rowSpacing)
  if (kind === 'area') return polygonAreaMm2(points, columnSpacing, rowSpacing)
  return distanceMm(points[0].u, points[0].v, points[1].u, points[1].v, columnSpacing, rowSpacing)
}

export function formatLength(lengthMm: number): string {
  return `${lengthMm.toFixed(2)} mm`
}

export function formatMeasure(kind: CtMeasureKind, value: number): string {
  if (kind === 'angle') return `${value.toFixed(1)}°`
  if (kind === 'area') return value >= 100 ? `${(value / 100).toFixed(2)} cm²` : `${value.toFixed(1)} mm²`
  return formatLength(value)
}

export const ctMeasureKindLabels: Record<CtMeasureKind, string> = {
  length: '长度', diameter: '直径', angle: '角度', area: '面积',
}
