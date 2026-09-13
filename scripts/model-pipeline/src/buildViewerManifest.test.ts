import { describe, expect, it } from 'vitest'
import { buildViewerManifest } from './buildViewerManifest.js'

describe('buildViewerManifest', () => {
  it('maps converted GLB variants into viewer layers', () => {
    const manifest = buildViewerManifest({
      caseId: 'lung_001',
      coordinateSystem: 'RAS',
      layers: [{
        id: 'lung-left',
        name: 'Left lung',
        color: '#72B7B2',
        files: { low: 'lung-left.low.glb', medium: 'lung-left.medium.glb' },
      }],
    }, '/public-data/msd-lung/lung_001')

    expect(manifest).toEqual({
      schemaVersion: 1,
      caseId: 'lung_001',
      unit: 'mm',
      coordinateSystem: 'RAS',
      layers: [{
        id: 'lung-left',
        name: 'Left lung',
        color: '#72B7B2',
        opacity: 1,
        visible: true,
        assets: {
          low: '/public-data/msd-lung/lung_001/lung-left.low.glb',
          medium: '/public-data/msd-lung/lung_001/lung-left.medium.glb',
        },
      }],
    })
  })

  it('rejects unsafe file paths', () => {
    expect(() => buildViewerManifest({
      caseId: 'lung_001',
      coordinateSystem: 'RAS',
      layers: [{ id: 'tumor', name: 'Tumor', color: '#E45756', files: { low: '../secret.glb' } }],
    }, '/public-data/msd-lung/lung_001')).toThrow('safe relative GLB path')
  })
})
