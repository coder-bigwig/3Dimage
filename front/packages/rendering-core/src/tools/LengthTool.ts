import { Vector3 } from 'three'

export type LengthUnit = 'mm' | 'cm' | 'm'
export interface MeasurementResult<U extends string = LengthUnit> { value: number; unit: U }

export function assertFinitePoints(points: Vector3[]): void {
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z))) {
    throw new Error('Measurement points must be finite')
  }
}

export function measureLength(start: Vector3, end: Vector3, unit: LengthUnit = 'mm'): MeasurementResult {
  assertFinitePoints([start, end])
  return { value: start.distanceTo(end), unit }
}
