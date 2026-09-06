import type { AssetQuality } from '../types'

export class QualityManager {
  initialQuality(): AssetQuality {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    const cores = navigator.hardwareConcurrency ?? 4
    return memory <= 4 || cores <= 4 ? 'low' : 'medium'
  }

  pixelRatio() { return Math.min(window.devicePixelRatio || 1, 2) }

  nextUpgrade(current: AssetQuality): AssetQuality | null {
    if (current === 'low') return 'medium'
    if (current === 'medium') return 'high'
    return null
  }
}
