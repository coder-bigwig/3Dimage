import { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class GlbLayerLoader {
  readonly #loader = new GLTFLoader()

  async load(url: string, signal?: AbortSignal): Promise<Object3D> {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`GLB download failed with HTTP ${response.status}`)
    const data = await response.arrayBuffer()
    if (signal?.aborted) throw new DOMException('Loading aborted', 'AbortError')
    const basePath = new URL('.', url).toString()
    const gltf = await this.#loader.parseAsync(data, basePath)
    return gltf.scene
  }
}
