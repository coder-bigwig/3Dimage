import { useState } from 'react'
import type { ManifestLayer } from '../../api/sharedViewer'
import { AnatomyGroupStrip, EyeIcon } from './AnatomyGroupStrip'
import { groupLayers } from './anatomyGroups'

export function MeasurementStrip({ layers, hidden, onToggle, onToggleGroup }: { layers: ManifestLayer[]; hidden: Set<string>; onToggle(id: string): void; onToggleGroup(ids: string[]): void }) {
  const [expanded, setExpanded] = useState(true)
  const groups = groupLayers(layers)
  const lungGroups = groups.filter(group => group.id !== 'other')
  const lungIds = lungGroups.flatMap(group => group.layerIds)
  const visibleCount = lungIds.filter(id => !hidden.has(id)).length
  const allVisible = lungIds.length > 0 && visibleCount === lungIds.length
  const allHidden = lungIds.length > 0 && visibleCount === 0

  return <section className="anatomy-strip" aria-label="模型分层">
    {expanded && <div className="anatomy-subgroups">
      {lungGroups.map(group => <AnatomyGroupStrip key={group.id} group={group} layers={layers} hidden={hidden} onToggle={onToggle} />)}
    </div>}
    <div className="measurement-strip">
      <div className={`measurement-group${expanded ? ' is-expanded' : ''}`}>
        <button className="measurement-group__label" aria-expanded={expanded} aria-label="肺叶" onClick={() => setExpanded(value => !value)}>肺叶</button>
        <button className="measurement-group__eye" data-visibility={allHidden ? 'hidden' : allVisible ? 'visible' : 'partial'} aria-label={`${allVisible ? '隐藏' : '显示'}全部肺叶`} onClick={() => onToggleGroup(lungIds)} disabled={!lungIds.length}><EyeIcon hidden={allHidden} mixed={!allVisible && !allHidden} /></button>
      </div>
      {groups.filter(group => group.id === 'other').map(group => <AnatomyGroupStrip key={group.id} group={group} layers={layers} hidden={hidden} onToggle={onToggle} />)}
    </div>
  </section>
}
