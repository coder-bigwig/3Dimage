import { Plane, Vector3 } from 'three'
import { assertFinitePoints } from './LengthTool'

export interface SerializableClipPlane { normal: [number, number, number]; constant: number }

export function createClipPlane(normal: Vector3, point: Vector3): { plane: Plane; state: SerializableClipPlane } {
  assertFinitePoints([normal, point])
  if (normal.lengthSq() === 0) throw new Error('Clip plane normal must have non-zero length')
  const plane = new Plane().setFromNormalAndCoplanarPoint(normal.clone().normalize(), point)
  return { plane, state: { normal: [plane.normal.x, plane.normal.y, plane.normal.z], constant: plane.constant } }
}
