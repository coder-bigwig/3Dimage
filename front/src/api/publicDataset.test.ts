import { describe, expect, it, vi } from 'vitest'
import { getPublicDatasetManifest } from './publicDataset'

describe('getPublicDatasetManifest', () => {
  it('preserves millimeter coordinates and the opted-in rendering style', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      title: 'Blender integrated', renderStyle: 'clinical', caseId: 'lung_001', unit: 'mm', coordinateSystem: 'RAS', layers: [],
    })))
    const manifest = await getPublicDatasetManifest('/manifest.json', undefined, fetcher)
    expect(manifest).toMatchObject({ title: 'Blender integrated', renderStyle: 'clinical', unit: 'mm', coordinateSystem: 'RAS' })
  })
  it('loads a public manifest without credentials', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      caseId: 'lung_001', unit: 'mm', coordinateSystem: 'RAS', layers: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const manifest = await getPublicDatasetManifest('/public-data/manifest.json', undefined, fetcher)

    expect(manifest.resultId).toBe('public-lung_001')
    expect(fetcher).toHaveBeenCalledWith('/public-data/manifest.json', {
      signal: undefined,
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    })
  })

  it('rejects manifests containing non-public asset URLs', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      caseId: 'lung_001', unit: 'mm', coordinateSystem: 'RAS',
      layers: [{ id: 'tumor', name: 'Tumor', color: '#E45756', opacity: 1, visible: true, assets: { low: 'https://example.test/model.glb?token=secret' } }],
    }), { status: 200 }))

    await expect(getPublicDatasetManifest('/public-data/manifest.json', undefined, fetcher)).rejects.toThrow('unsafe asset URL')
  })
})
