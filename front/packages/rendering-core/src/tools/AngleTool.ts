import { MathUtils, Vector3 } from 'three'
import { assertFinitePoints, type MeasurementResult } from './LengthTool'

export function measureAngle(first: Vector3, vertex: Vector3, second: Vector3): MeasurementResult<'deg'> {
  assertFinitePoints([first, vertex, second])
  const left = first.clone().sub(vertex)
  const right = second.clone().sub(vertex)
  if (left.lengthSq() === 0 || right.lengthSq() === 0) throw new Error('Angle segments must have non-zero length')
  const cosine = MathUtils.clamp(left.normalize().dot(right.normalize()), -1, 1)
  return { value: MathUtils.radToDeg(Math.acos(cosine)), unit: 'deg' }
}
