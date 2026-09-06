import { Vector3 } from 'three'
import { assertFinitePoints, type LengthUnit, type MeasurementResult } from './LengthTool'

export function measureClosedArea(points: Vector3[], unit: LengthUnit = 'mm'): MeasurementResult<string> {
  if (points.length < 3) throw new Error('A closed area requires at least three points')
  assertFinitePoints(points)
  const accumulated = new Vector3()
  for (let index = 0; index < points.length; index += 1) {
    accumulated.add(new Vector3().crossVectors(points[index], points[(index + 1) % points.length]))
  }
  return { value: accumulated.length() / 2, unit: `${unit}²` }
}
