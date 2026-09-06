import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, isAbsolute, normalize, sep } from 'node:path'
import { unzipSync } from 'fflate'

export type ModelFormat = 'glb' | 'stl' | 'obj'
export type SourceUnit = 'mm' | 'cm' | 'm'
export type CoordinateSystem = 'LPS' | 'RAS'
export interface ModelInput { path: string; format: ModelFormat; sourceUnit?: SourceUnit; coordinateSystem?: CoordinateSystem; layerNames?: string[]; layerMappingPath?: string; bounds?: number[]; triangleCount?: number; textureBytes?: number }
export interface ValidationLimits { maxFileBytes: number; maxExpandedBytes: number; maxArchiveEntries: number; maxTriangles: number; maxTextureBytes: number }
export interface ValidationResult { errors: string[]; sha256?: string }

export const defaultLimits: ValidationLimits = { maxFileBytes: 2_000_000_000, maxExpandedBytes: 4_000_000_000, maxArchiveEntries: 10_000, maxTriangles: 20_000_000, maxTextureBytes: 512_000_000 }

export async function validateInput(input: ModelInput, limits: ValidationLimits = defaultLimits): Promise<ValidationResult> {
  const errors: string[] = []
  const expectedExtension = input.format === 'obj' ? '.zip' : `.${input.format}`
  if (extname(input.path).toLowerCase() !== expectedExtension) errors.push(`${input.format.toUpperCase()} input must use ${expectedExtension}`)
  if (input.format === 'stl' && !input.sourceUnit) errors.push('STL requires an explicit source unit')
  if (!input.sourceUnit) errors.push('Source unit is required')
  if (!input.coordinateSystem) errors.push('Coordinate system is required')
  if (!input.layerMappingPath && (!input.layerNames || input.layerNames.length === 0 || input.layerNames.some(name => !name.trim()))) errors.push('Layer names or a layer-mapping file are required')
  if (input.bounds && (input.bounds.length !== 6 || input.bounds.some(value => !Number.isFinite(value)))) errors.push('Geometry bounds must contain six finite numbers')
  if (input.triangleCount != null && input.triangleCount > limits.maxTriangles) errors.push('Triangle limit exceeded')
  if (input.textureBytes != null && input.textureBytes > limits.maxTextureBytes) errors.push('Texture size limit exceeded')
  try {
    const data = await readFile(input.path)
    if (data.byteLength > limits.maxFileBytes) errors.push('File size limit exceeded')
    if (input.format === 'obj') errors.push(...(await validateArchive(input.path, limits)).errors)
    return { errors: [...new Set(errors)], sha256: createHash('sha256').update(data).digest('hex') }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push('Input file cannot be read')
    return { errors: [...new Set(errors)] }
  }
}

export async function validateArchive(path: string, limits: ValidationLimits = defaultLimits): Promise<ValidationResult> {
  const errors: string[] = []
  try {
    const archive = await readFile(path)
    if (archive.byteLength > limits.maxFileBytes) errors.push('File size limit exceeded')
    let expandedBytes = 0
    let entryCount = 0
    const entries = unzipSync(archive, { filter: file => {
      entryCount += 1
      expandedBytes += file.originalSize
      const normalized = normalize(file.name.replaceAll('/', sep))
      if (isAbsolute(normalized) || normalized === '..' || normalized.startsWith(`..${sep}`)) errors.push('Archive entry escapes extraction root')
      return entryCount <= limits.maxArchiveEntries && expandedBytes <= limits.maxExpandedBytes && errors.length === 0
    } })
    const names = Object.keys(entries)
    if (entryCount > limits.maxArchiveEntries) errors.push('Archive entry limit exceeded')
    if (expandedBytes > limits.maxExpandedBytes) errors.push('Archive expanded size limit exceeded')
    const lookup = new Set(names.map(name => normalize(name).toLowerCase()))
    const objNames = names.filter(name => name.toLowerCase().endsWith('.obj'))
    if (objNames.length !== 1) errors.push('OBJ archive must contain exactly one OBJ file')
    for (const objName of objNames) {
      const text = new TextDecoder().decode(entries[objName])
      for (const match of text.matchAll(/^mtllib\s+(.+)$/gmi)) {
        const dependency = normalize(joinArchive(dirnameArchive(objName), match[1].trim())).toLowerCase()
        if (!lookup.has(dependency)) errors.push(`OBJ dependency is missing: ${match[1].trim()}`)
      }
    }
  } catch { if (!errors.length) errors.push('Archive is invalid') }
  return { errors: [...new Set(errors)] }
}

const dirnameArchive = (path: string) => path.replaceAll('\\', '/').split('/').slice(0, -1).join('/')
const joinArchive = (directory: string, file: string) => directory ? `${directory}/${file}` : file
