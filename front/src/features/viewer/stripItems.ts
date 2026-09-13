import type { ManifestLayer } from '../../api/sharedViewer'
import { referenceCategory, referenceCategoryOrder } from './referenceCategory'
import { groupLayers } from './anatomyGroups'

export interface StripItem { name: string; volume?: string; color: string; ids: string[]; off: boolean; mixed: boolean }

const fallbackSwatch = '#ef1111'

function volumeLabel(layers: ManifestLayer[]): string | undefined {
  const total = layers.reduce((sum, layer) => sum + (typeof layer.volumeMl === 'number' ? layer.volumeMl : 0), 0)
  return total > 0 ? `${total.toFixed(2)}ml` : undefined
}

/**
 * Derives the bottom structure bar from the manifest instead of a hardcoded list.
 * - A rich case yields several reference categories (占位 / 肺段 / 肺 / 动脉 / 静脉 / 气管 / 占位_安全边界…).
 * - When the data only carries lung lobes, fall back to the anatomical lobe groups, so the bar
 *   still reflects real structures. Volumes are always taken from layer data — never faked.
 */
export function buildStripItems(layers: ManifestLayer[], hidden: Set<string>): StripItem[] {
  const categories = referenceCategoryOrder
    .map(name => ({ name: name as string, members: layers.filter(layer => referenceCategory(layer) === name) }))
    .filter(entry => entry.members.length > 0)

  const entries = categories.length > 1
    ? categories
    : groupLayers(layers).map(group => ({ name: group.name, members: layers.filter(layer => group.layerIds.includes(layer.id)) }))

  return entries.map(({ name, members }) => {
    const ids = members.map(layer => layer.id)
    const hiddenCount = ids.filter(id => hidden.has(id)).length
    return {
      name,
      ids,
      color: members.find(layer => layer.color)?.color ?? fallbackSwatch,
      volume: volumeLabel(members),
      off: hiddenCount === ids.length,
      mixed: hiddenCount > 0 && hiddenCount < ids.length,
    }
  })
}
