import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { validateArchive, validateInput } from './validateInput.js'
import { buildImmutableObjectKeys } from './buildManifest.js'
import { buildReport } from './report.js'

describe('model input validation', () => {
  it('rejects STL without an explicit unit', async () => {
    const result = await validateInput({ path: 'lung.stl', format: 'stl' })
    expect(result.errors).toContain('STL requires an explicit source unit')
  })

  it('rejects an OBJ archive with a traversal entry', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'medical3d-'))
    const archive = join(directory, 'traversal.zip')
    await writeFile(archive, zipSync({ '../escape.obj': strToU8('v 0 0 0') }))
    const result = await validateArchive(archive)
    expect(result.errors).toContain('Archive entry escapes extraction root')
  })

  it('accepts a valid GLB with unit, coordinates, bounds and a layer name', async () => {
    const result = await validateInput({ path: 'lung.glb', format: 'glb', sourceUnit: 'mm', coordinateSystem: 'LPS', layerNames: ['右上叶'], bounds: [0, 0, 0, 2, 3, 4] })
    expect(result.errors).toEqual([])
  })

  it('rejects a missing OBJ material dependency', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'medical3d-'))
    const archive = join(directory, 'missing.zip')
    await writeFile(archive, zipSync({ 'lung.obj': strToU8('mtllib lung.mtl\nv 0 0 0') }))
    expect((await validateArchive(archive)).errors).toContain('OBJ dependency is missing: lung.mtl')
  })

  it('enforces expanded archive size before extracting entries', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'medical3d-'))
    const archive = join(directory, 'large.zip')
    await writeFile(archive, zipSync({ 'lung.obj': new Uint8Array(100) }))
    const limits = { maxFileBytes: 1000, maxExpandedBytes: 50, maxArchiveEntries: 10, maxTriangles: 10, maxTextureBytes: 10 }
    expect((await validateArchive(archive, limits)).errors).toContain('Archive expanded size limit exceeded')
  })

  it('creates immutable keys and records a failed quality report', () => {
    const digest = 'a'.repeat(64)
    expect(buildImmutableObjectKeys(digest, '右上叶').keys.low).toContain(digest)
    const report = buildReport({ sourceSha256: digest, toolImageDigest: `sha256:${digest}`, arguments: ['--safe'], sourceBounds: { min: [0, 0, 0], max: [1, 1, 1] }, targetBounds: { min: [0, 0, 0], max: [1, 1, 1] }, sourceTriangles: 10, targetTriangles: 5, maxSampledVertexErrorMm: 1.2 }, .5)
    expect(report.qualityPassed).toBe(false)
  })
})
