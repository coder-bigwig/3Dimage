import { useEffect, useRef, useState } from 'react'
import type { ViewerManifest } from '../../api/sharedViewer'
import { ViewerEngine } from '../../../packages/rendering-core/src/ViewerEngine'
import type { ViewerTool } from './viewer.store'
import type { ToolRecord } from '../../../packages/rendering-core/src/tools/ToolRecords'

export interface ViewerCanvasHandle { reset(): void; setAutoRotate(value: boolean): void; setBackground(color: string): void; setVisible(id: string, value: boolean): void; activateTool(tool: ViewerTool | null): void; restoreLayerPositions(): void; toolCommand(command: string): void; setAnnotationText(text: string): void; editAnnotation(id: string, text: string): void; restoreAnnotations(items: ToolRecord[]): void; removeRecord(id: string): void }

export function ViewerCanvas({ manifest, engineRef, hidden = new Set<string>() }: { manifest: ViewerManifest; engineRef: React.MutableRefObject<ViewerCanvasHandle | null>; hidden?: Set<string> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [initializationFailed, setInitializationFailed] = useState(false)
  const hiddenRef = useRef(hidden)
  useEffect(() => { hiddenRef.current = hidden }, [hidden])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    for (const layer of manifest.layers) {
      try { engine.setVisible(layer.id, !hidden.has(layer.id)) } catch { /* resource is not registered yet */ }
    }
  }, [engineRef, hidden, manifest.layers])

  useEffect(() => {
    if (!canvasRef.current) return
    setInitializationFailed(false)
    let disposed = false
    let engine: ViewerEngine
    try {
      engine = new ViewerEngine(canvasRef.current)
      engineRef.current = engine
      void engine.load({ renderStyle: manifest.renderStyle, unit: manifest.unit, coordinateSystem: manifest.coordinateSystem, layers: manifest.layers.map(layer => ({
        id: layer.id, name: layer.name, color: layer.color, opacity: layer.opacity,
        visible: layer.visible, assets: layer.assets,
      })) }).then(() => {
        if (disposed) return
        for (const layer of manifest.layers) {
          try { engine.setVisible(layer.id, !hiddenRef.current.has(layer.id)) } catch { /* failed resources remain unavailable */ }
        }
        if (!disposed && manifest.layers.length > 0 && !engine.layerSnapshots().some(layer => layer.loadState === 'ready')) {
          setInitializationFailed(true)
        }
        canvasRef.current?.dispatchEvent(new CustomEvent('viewer-ready', { bubbles: true }))
      }).catch(() => { if (!disposed) setInitializationFailed(true) })
    } catch {
      queueMicrotask(() => { if (!disposed) setInitializationFailed(true) })
      return () => { disposed = true }
    }
    return () => { disposed = true; engineRef.current = null; engine.dispose() }
  }, [engineRef, manifest])

  return <div className="viewer-canvas-wrap">
    <canvas ref={canvasRef} className="viewer-canvas" aria-label="三维模型画布" data-testid="viewer-canvas" data-load-state={initializationFailed ? 'error' : 'ready'} />
    {initializationFailed && <div className="viewer-canvas-error" role="alert">
      <strong>模型资源未加载</strong>
      <span>请先生成或配置可访问的 GLB 模型文件。</span>
    </div>}
  </div>
}
