import { useEffect, useRef, useState } from 'react'
import type { ViewerManifest } from '../../api/sharedViewer'
import { ViewerEngine } from '../../../packages/rendering-core/src/ViewerEngine'

export interface ViewerCanvasHandle { reset(): void; setAutoRotate(value: boolean): void; setBackground(color: string): void; setVisible(id: string, value: boolean): void }

export function ViewerCanvas({ manifest, engineRef }: { manifest: ViewerManifest; engineRef: React.MutableRefObject<ViewerCanvasHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasAssets = manifest.layers.some(layer => Object.keys(layer.assets).length)
  const [failedManifestId, setFailedManifestId] = useState<string | null>(null)
  const modelFailed = hasAssets && failedManifestId === manifest.resultId

  useEffect(() => {
    if (!canvasRef.current || !hasAssets) return
    let disposed = false
    let engine: ViewerEngine
    try {
      engine = new ViewerEngine(canvasRef.current)
      engineRef.current = engine
      void engine.load({ unit: manifest.unit, layers: manifest.layers.map(layer => ({
        id: layer.id, name: layer.name, color: layer.color, opacity: layer.opacity,
        visible: layer.visible, assets: layer.assets,
      })) }).then(() => {
        if (!disposed && engine.layerSnapshots().every(snapshot => snapshot.loadState !== 'ready')) setFailedManifestId(manifest.resultId)
      }).catch(() => { if (!disposed) setFailedManifestId(manifest.resultId) })
    } catch {
      queueMicrotask(() => { if (!disposed) setFailedManifestId(manifest.resultId) })
      return () => { disposed = true }
    }
    return () => { disposed = true; engineRef.current = null; engine.dispose() }
  }, [engineRef, hasAssets, manifest])

  return <div className="viewer-canvas-wrap">
    <canvas ref={canvasRef} className="viewer-canvas" aria-label="三维模型画布" data-testid="viewer-canvas" data-load-state={modelFailed ? 'error' : 'ready'} />
    {(!hasAssets || modelFailed) && <div className="anatomy-demo" aria-label="三维肺部演示模型">
      <i className="trachea" /><i className="lung lung--left" /><i className="lung lung--right" />
      <i className="lobe lobe--one" /><i className="lobe lobe--two" /><i className="lobe lobe--three" />
      <span className="measure-label">103.934mm</span>
      <span className="measure-line" />
    </div>}
  </div>
}
