/** Loading and validation of the browser CT volume emitted by scripts/public-data/build-ct-volume.py. */

export interface CtWindowPreset { key: string; label: string; width: number; center: number }

export interface CtVolumeMeta {
  caseId?: string
  seriesName?: string
  sliceThicknessMm?: number
  studyDate?: string
  studyTime?: string
  note?: string
}

export interface CtVolumeDescriptor {
  schemaVersion: number
  caseId: string
  dims: [number, number, number]
  spacing: [number, number, number]
  dataType: string
  byteOrder: string
  dataFile: string
  huRange: [number, number]
  defaultWindow: { center: number; width: number }
  presets?: CtWindowPreset[]
  meta?: CtVolumeMeta
}

export interface CtVolume {
  descriptor: CtVolumeDescriptor
  width: number
  height: number
  depth: number
  spacing: [number, number, number]
  /** z-major, then y, then x — index = k * height * width + j * width + i */
  data: Int16Array
}

type Fetcher = typeof fetch

export function resolveVolumeDataUrl(descriptorUrl: string, dataFile: string): string {
  if (/^https?:\/\//.test(dataFile)) return dataFile
  const directory = descriptorUrl.slice(0, descriptorUrl.lastIndexOf('/') + 1)
  return `${directory}${dataFile.replace(/^\.\//, '')}`
}

function assertDescriptor(value: unknown): CtVolumeDescriptor {
  const descriptor = value as CtVolumeDescriptor
  if (!descriptor || !Array.isArray(descriptor.dims) || descriptor.dims.length !== 3) {
    throw new Error('CT 体数据描述文件缺少 dims')
  }
  if (descriptor.dims.some(dim => !Number.isInteger(dim) || dim <= 0)) {
    throw new Error('CT 体数据 dims 非法')
  }
  if (descriptor.dataType !== 'int16') {
    throw new Error(`CT 体数据暂不支持 ${descriptor.dataType} 类型`)
  }
  if (!descriptor.dataFile) throw new Error('CT 体数据描述文件缺少 dataFile')
  return descriptor
}

export async function loadCtVolume(
  descriptorUrl: string,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<CtVolume> {  const descriptorResponse = await fetcher(descriptorUrl, { signal, headers: { Accept: 'application/json' }, credentials: 'omit' })
  if (!descriptorResponse.ok) throw new Error(`无法加载 CT 影像描述 (${descriptorResponse.status})`)
  const descriptor = assertDescriptor(await descriptorResponse.json())

  const [width, height, depth] = descriptor.dims
  const expectedBytes = width * height * depth * 2
  const dataResponse = await fetcher(resolveVolumeDataUrl(descriptorUrl, descriptor.dataFile), { signal, credentials: 'omit' })
  if (!dataResponse.ok) throw new Error(`无法加载 CT 影像数据 (${dataResponse.status})`)
  const buffer = await dataResponse.arrayBuffer()
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(`CT 影像数据长度不符：期望 ${expectedBytes} 字节，实际 ${buffer.byteLength}`)
  }
  return {
    descriptor,
    width,
    height,
    depth,
    spacing: [descriptor.spacing[0] ?? 1, descriptor.spacing[1] ?? 1, descriptor.spacing[2] ?? 1],
    data: new Int16Array(buffer),
  }
}

const cache = new Map<string, Promise<CtVolume>>()

/** Volumes are tens of megabytes; keep one promise per descriptor for the session. */
export function loadCtVolumeCached(descriptorUrl: string, fetcher: Fetcher = fetch): Promise<CtVolume> {
  const existing = cache.get(descriptorUrl)
  if (existing) return existing
  const pending = loadCtVolume(descriptorUrl, undefined, fetcher).catch(error => {
    cache.delete(descriptorUrl)
    throw error
  })
  cache.set(descriptorUrl, pending)
  return pending
}
