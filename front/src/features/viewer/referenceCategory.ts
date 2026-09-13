import type { ManifestLayer } from '../../api/sharedViewer'

// Reference display order for the bottom structure bar.
export const referenceCategoryOrder = [
  '占位', '肺段', '肺', '动脉', '静脉', '气管',
  '占位_安全边界(15mm)', '占位_安全边界(20mm)',
] as const

export type ReferenceCategory = typeof referenceCategoryOrder[number]

// Match specific structures before the broad lung category; unknown layers stay in 全部分层.
export function referenceCategory(layer: ManifestLayer): string | undefined {
  const text = `${layer.code} ${layer.id} ${layer.name}`.toLowerCase()
  if (/安全边界|margin|boundary/.test(text)) {
    if (/15\s*mm/.test(text)) return '占位_安全边界(15mm)'
    if (/20\s*mm/.test(text)) return '占位_安全边界(20mm)'
    return undefined
  }
  if (/占位|结节|肿瘤|nodule|tumou?r|lesion/.test(text)) return '占位'
  if (/动脉|arter/.test(text)) return '动脉'
  if (/静脉|vein|venous/.test(text)) return '静脉'
  if (/气管|trachea|bronch|airway/.test(text)) return '气管'
  if (/肺段|segment/.test(text)) return '肺段'
  if (/肺|lung|\b(rul|rml|rll|lul|lll|rs[1-5])\b/.test(text)) return '肺'
  return undefined
}
