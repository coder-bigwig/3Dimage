import { Vector3 } from 'three'
import { measureAngle } from './AngleTool'
import { measureClosedArea } from './ClosedAreaTool'

export type RecordTool = 'length' | 'diameter' | 'angle' | 'closedArea' | 'annotation'
export interface Anchor { layerId: string; position: [number, number, number] }
export interface ToolRecord { id: string; tool: RecordTool; points: Anchor[]; label: string }

export class ToolRecords {
  items: ToolRecord[] = []
  pending: Anchor[] = []
  #history: ToolRecord[][] = []
  add(tool: RecordTool, point: Anchor, text = '', resolve: (point: Anchor) => Vector3 = p => new Vector3(...p.position)) {
    if (!point.position.every(Number.isFinite)) throw new Error('无效的模型坐标')
    if (tool === 'annotation' && !text.trim()) throw new Error('请先输入标注文字')
    const points = [...this.pending, structuredClone(point)]
    const count = tool === 'annotation' ? 1 : tool === 'angle' ? 3 : tool === 'closedArea' ? Infinity : 2
    if (points.length < count) { this.pending = points; return }
    const vectors = points.map(resolve)
    const label = tool === 'annotation' ? text.trim().slice(0, 200) : tool === 'angle'
      ? `${measureAngle(vectors[0], vectors[1], vectors[2]).value.toFixed(2)}°`
      : `${vectors[0].distanceTo(vectors[1]).toFixed(2)} mm`
    this.commit({ id: crypto.randomUUID(), tool, points, label })
  }
  finishArea(resolve: (point: Anchor) => Vector3 = p => new Vector3(...p.position)) {
    if (this.pending.length < 3) throw new Error('闭合测量至少需要三个点')
    const area = measureClosedArea(this.pending.map(resolve)).value
    this.commit({ id: crypto.randomUUID(), tool: 'closedArea', points: structuredClone(this.pending), label: `${area.toFixed(2)} mm²` })
  }
  private commit(item: ToolRecord) { this.remember(); this.items.push(item); this.pending = [] }
  private remember() { this.#history.push(structuredClone(this.items)); if (this.#history.length > 100) this.#history.shift() }
  undo() { if (this.pending.length) this.pending.pop(); else this.items = this.#history.pop() ?? this.items }
  clear(tool: RecordTool) { this.remember(); this.pending = []; this.items = this.items.filter(item => (item.tool === 'annotation') !== (tool === 'annotation')) }
  remove(id: string) { this.remember(); this.items = this.items.filter(item => item.id !== id) }
  restore(items: ToolRecord[]) { this.items = structuredClone(items); this.pending = []; this.#history = [] }
}
