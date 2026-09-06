import type { ManifestLayer } from '../../api/sharedViewer'
export function LayerBottomSheet({ open, layers, onClose }: { open: boolean; layers: ManifestLayer[]; onClose(): void }) {
  if (!open) return null
  return <section className="bottom-sheet" aria-label="全部分层"><header><h2>模型分层</h2><button onClick={onClose}>关闭</button></header>{layers.map(layer => <p key={layer.id}><span style={{ background: layer.color }} />{layer.name}</p>)}</section>
}
