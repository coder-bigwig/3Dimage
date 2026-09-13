import type { ManifestLayer } from '../../api/sharedViewer'

export interface AnatomyGroup { id: string; name: string; layerIds: string[] }

const groupByCode: Record<string, string> = {
  rs1: 'right-upper', RUL: 'right-upper', rs2: 'right-middle', RML: 'right-middle',
  rs3: 'right-lower', RLL: 'right-lower', rs4: 'left-upper', LUL: 'left-upper',
  rs5: 'left-lower', LLL: 'left-lower',
}
const groupById: Record<string, string> = {
  'lung-upper-lobe-right': 'right-upper', 'lung-middle-lobe-right': 'right-middle',
  'lung-lower-lobe-right': 'right-lower', 'lung-upper-lobe-left': 'left-upper',
  'lung-lower-lobe-left': 'left-lower',
}
const definitions = [
  ['right-upper', '右上'], ['right-middle', '右中'], ['right-lower', '右下'],
  ['left-upper', '左上'], ['left-lower', '左下'], ['other', '其他'],
] as const

export function groupLayers(layers: ManifestLayer[]): AnatomyGroup[] {
  const members = new Map<string, string[]>(definitions.map(([id]) => [id, []]))
  for (const layer of layers) {
    const groupId = groupByCode[layer.code] ?? groupById[layer.id] ?? 'other'
    members.get(groupId)?.push(layer.id)
  }
  return definitions.map(([id, name]) => ({ id, name, layerIds: members.get(id) ?? [] })).filter(group => group.layerIds.length > 0)
}
