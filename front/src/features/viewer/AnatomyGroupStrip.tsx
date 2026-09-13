import type { ManifestLayer } from '../../api/sharedViewer'
import type { AnatomyGroup } from './anatomyGroups'
import { ViewerIcon } from './ViewerIcon'

export function EyeIcon({ hidden, mixed = false }: { hidden: boolean; mixed?: boolean }) {
  return <span className={mixed ? 'eye-icon eye-icon--mixed' : 'eye-icon'}><ViewerIcon name={hidden ? 'eye-off' : 'eye'} size={22} /></span>
}

export function AnatomyGroupStrip({ group, layers, hidden, onToggle }: { group: AnatomyGroup; layers: ManifestLayer[]; hidden: Set<string>; onToggle(id: string): void }) {
  const members = layers.filter(layer => group.layerIds.includes(layer.id))
  return <nav className="anatomy-groups" aria-label={`${group.name}肺叶`}>
    {members.map(layer => {
      const canonicalLobe = layer.id.startsWith('lung-') || /^(右上|右中|右下|左上|左下)叶?$/.test(layer.name)
      const displayName = group.layerIds.length === 1 && canonicalLobe ? group.name : layer.name
      return <div className={`anatomy-layer-item${hidden.has(layer.id) ? ' is-hidden' : ''}`} key={layer.id}>
      <span className="layer-color" style={{ background: layer.color }} />
      <div className="anatomy-layer-copy">
        <button className="anatomy-layer-name" onClick={() => onToggle(layer.id)}>{displayName}</button>
        <small>{layer.volumeMl == null ? '\u00a0' : `${layer.volumeMl.toFixed(2)}ml`}</small>
      </div>
      <button className="anatomy-eye" aria-label={`${hidden.has(layer.id) ? '显示' : '隐藏'} ${displayName}`} onClick={() => onToggle(layer.id)}><EyeIcon hidden={hidden.has(layer.id)} /></button>
    </div>})}
  </nav>
}
