/** Window presets, mirroring the reference viewer's 宽位 menu. */

export interface CtWindowOption {
  key: string
  label: string
  /** null means "restore the volume default window". */
  width: number | null
  center: number | null
  hint?: string
}

export const ctWindowOptions: readonly CtWindowOption[] = [
  { key: 'reset', label: '重置窗宽窗位', width: null, center: null },
  { key: 'bone', label: '骨窗', width: 2000, center: 500, hint: 'W:2000, C:500' },
  { key: 'lung', label: '肺窗', width: 1600, center: -600, hint: 'W:1600, C:-600' },
  { key: 'abdomen', label: '腹窗', width: 400, center: 40, hint: 'W:400, C:40' },
  { key: 'brain', label: '脑窗', width: 70, center: 30, hint: 'W:70, C:30' },
  { key: 'soft', label: '软组织窗', width: 350, center: 50, hint: 'W:350, C:50' },
  { key: 'liver', label: '肝窗', width: 160, center: 60, hint: 'W:160, C:60' },
  { key: 'mediastinum', label: '纵膈窗', width: 500, center: 50, hint: 'W:500, C:50' },
  { key: 'stroke', label: '卒中窗', width: 30, center: 30, hint: 'W:30, C:30' },
  { key: 'cta', label: 'CTA窗', width: 600, center: 170, hint: 'W:600, C:170' },
] as const

export interface CtWindowState { center: number; width: number }

export function resolveWindowOption(option: CtWindowOption, fallback: CtWindowState): CtWindowState {
  if (option.width === null || option.center === null) return { ...fallback }
  return { center: option.center, width: option.width }
}

/** Window drag: horizontal changes width, vertical changes centre (reference behaviour). */
export function applyWindowDrag(start: CtWindowState, deltaX: number, deltaY: number): CtWindowState {
  return {
    width: Math.max(1, Math.round(start.width + deltaX * 4)),
    center: Math.round(start.center + deltaY * 2),
  }
}
