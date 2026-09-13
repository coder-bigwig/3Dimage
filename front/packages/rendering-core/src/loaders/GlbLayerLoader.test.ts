import { Group } from 'three'
import { afterEach, expect, test, vi } from 'vitest'
import { GlbLayerLoader } from './GlbLayerLoader'

const parseAsync = vi.fn(async (_data: ArrayBuffer, basePath: string) => ({ scene: new Group(), basePath }))

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class { parseAsync = parseAsync },
}))

afterEach(() => {
  vi.restoreAllMocks()
  parseAsync.mockClear()
})

test('resolves a relative GLB URL before fetching and parsing', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ArrayBuffer(0), { status: 200 })))

  await new GlbLayerLoader().load('/public-data/lung.medium.glb')

  expect(fetch).toHaveBeenCalledWith('http://localhost:3000/public-data/lung.medium.glb', { signal: undefined })
  expect(parseAsync).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'http://localhost:3000/public-data/')
})
