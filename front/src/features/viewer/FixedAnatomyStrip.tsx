import type { ManifestLayer } from '../../api/sharedViewer'
import { buildStripItems } from './stripItems'
import { groupLayers } from './anatomyGroups'
import eyeOn from '../../assets/model-tree/modelTree_eye1_light.png'
import eyeMixed from '../../assets/model-tree/modelTree_eye2_light.png'
import eyeOff from '../../assets/model-tree/modelTree_eye3_light.png'

type Props = {
  layers?: ManifestLayer[]
  hidden?: Set<string>
  selected?: string | null
  onSelect?(name: string): void
  onToggle?(ids: string[]): void
}

function VisibilityButton({ name, ids, off, mixed = false, onToggle }: {
  name: string; ids: string[]; off: boolean; mixed?: boolean; onToggle?: Props['onToggle']
}) {
  return <button type="button" className={`reference-eye reference-eye--${off ? 'off' : 'on'}${mixed ? ' reference-eye--mixed' : ''}`} aria-label={`${off || mixed ? '显示' : '隐藏'} ${name}`} aria-pressed={mixed ? 'mixed' : !off} onClick={() => onToggle?.(ids)}>
    <img src={off ? eyeOff : mixed ? eyeMixed : eyeOn} width={23} height={23} alt="" />
  </button>
}

export function FixedAnatomyStrip({ layers = [], hidden = new Set(), selected = null, onSelect, onToggle }: Props) {
  const items = buildStripItems(layers, hidden)
  if (items.length === 0) return null
  const active = items.find(item => item.name === selected)
  const activeLayers = active ? layers.filter(layer => active.ids.includes(layer.id)) : []
  const members = active?.name === '肺'
    ? groupLayers(activeLayers).flatMap(group => activeLayers.filter(layer => group.layerIds.includes(layer.id)).map(layer => ({
      ...layer,
      name: group.id !== 'other' && group.layerIds.length === 1 ? group.name : layer.name,
    })))
    : activeLayers
  return <section className="reference-anatomy-strip" aria-label="模型分层参考栏">
    {active && <section key={active.name} className="reference-child-list" aria-label={`${active.name}子模型`}>
      {members.map(layer => <div className={`reference-child-item${hidden.has(layer.id) ? ' is-hidden' : ''}`} key={layer.id}>
        <button type="button" className="reference-layer-copy" aria-label={`切换 ${layer.name}`} onClick={() => onToggle?.([layer.id])}>
          <span className="reference-layer-name"><span className="reference-layer-swatch" style={{ backgroundColor: layer.color }} />{layer.name}</span>
          {layer.volumeMl != null && <span className="reference-layer-volume">{layer.volumeMl.toFixed(2)}ml</span>}
        </button>
        <VisibilityButton name={layer.name} ids={[layer.id]} off={hidden.has(layer.id)} onToggle={onToggle} />
        <span className="reference-layer-divider" aria-hidden="true" />
      </div>)}
    </section>}
    <div className="reference-layer-list">
      {items.map(item => <div className={`reference-layer-item${selected === item.name ? ' is-selected' : ''}${item.off ? ' is-hidden' : ''}`} key={item.name}>
        <button type="button" className="reference-layer-copy" aria-label={`选择 ${item.name}`} aria-pressed={selected === item.name} aria-expanded={selected === item.name} onClick={() => onSelect?.(item.name)}>
          <span className="reference-layer-name"><span className="reference-layer-swatch" style={{ backgroundColor: item.color }} />{item.name}</span>
          {item.volume && <span className="reference-layer-volume">{item.volume}</span>}
        </button>
        <VisibilityButton name={item.name} ids={item.ids} off={item.off} mixed={item.mixed} onToggle={onToggle} />
        <span className="reference-layer-divider" aria-hidden="true" />
      </div>)}
    </div>
  </section>
}
