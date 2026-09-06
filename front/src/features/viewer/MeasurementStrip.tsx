import type { ManifestLayer } from '../../api/sharedViewer'

export function MeasurementStrip({ layers, hidden, onToggle }: { layers: ManifestLayer[]; hidden: Set<string>; onToggle(id: string): void }) {
  return <div className="measurement-strip" aria-label="模型分层">
    {layers.map(layer => <div className="measurement-item" key={layer.id}>
      <span className="layer-color" style={{ background: layer.color }} />
      <span><b>{layer.id}</b>{layer.volumeMl != null && <small>{layer.volumeMl.toFixed(2)}ml</small>}</span>
      <button aria-label={`${hidden.has(layer.id) ? '显示' : '隐藏'} ${layer.id}`} onClick={() => onToggle(layer.id)}>{hidden.has(layer.id) ? '◉̸' : '◉'}</button>
    </div>)}
  </div>
}
