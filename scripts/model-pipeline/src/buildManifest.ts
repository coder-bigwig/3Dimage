export type Variant = 'original' | 'canonical' | 'high' | 'medium' | 'low' | 'report' | 'thumbnail'
export interface ImmutableObjectKeys { sourceSha256: string; layer: string; keys: Record<Variant, string> }

const safe = (value: string) => value.normalize('NFKC').trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '')

export function buildImmutableObjectKeys(sourceSha256: string, layerName: string): ImmutableObjectKeys {
  if (!/^[a-f0-9]{64}$/i.test(sourceSha256)) throw new Error('A SHA-256 source digest is required')
  const layer = safe(layerName)
  if (!layer) throw new Error('Layer name is required')
  const root = `models/${sourceSha256.toLowerCase()}/${layer}`
  return { sourceSha256: sourceSha256.toLowerCase(), layer, keys: {
    original: `${root}/original`, canonical: `${root}/canonical.glb`, high: `${root}/high.glb`,
    medium: `${root}/medium.glb`, low: `${root}/low.glb`, report: `${root}/report.json`, thumbnail: `${root}/thumbnail.webp`,
  } }
}
