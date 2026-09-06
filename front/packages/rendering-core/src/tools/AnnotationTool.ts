import { Vector3 } from 'three'
import { assertFinitePoints } from './LengthTool'

export interface Annotation { id: string; text: string; position: [number, number, number] }

export function createAnnotation(id: string, text: string, position: Vector3): Annotation {
  assertFinitePoints([position])
  const trimmed = text.trim()
  if (!id.trim() || !trimmed) throw new Error('Annotation id and text are required')
  return { id, text: trimmed, position: [position.x, position.y, position.z] }
}
