import { Vector3 } from 'three'
import { measureLength, type LengthUnit, type MeasurementResult } from './LengthTool'

export function measureDiameter(firstEdge: Vector3, oppositeEdge: Vector3, unit: LengthUnit = 'mm'): MeasurementResult {
  return measureLength(firstEdge, oppositeEdge, unit)
}
