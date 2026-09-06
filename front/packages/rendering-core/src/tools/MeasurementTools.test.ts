import { Vector3 } from 'three'
import { expect, test } from 'vitest'
import { measureAngle } from './AngleTool'
import { measureClosedArea } from './ClosedAreaTool'
import { measureDiameter } from './DiameterTool'
import { measureLength } from './LengthTool'

test('measures millimetres in model coordinates', () => {
  expect(measureLength(new Vector3(0, 0, 0), new Vector3(3, 4, 0), 'mm'))
    .toEqual({ value: 5, unit: 'mm' })
})

test('rejects a non-finite measurement point', () => {
  expect(() => measureLength(new Vector3(Number.NaN, 0, 0), new Vector3(), 'mm'))
    .toThrow('Measurement points must be finite')
})

test('measures diameter as an explicit two-point segment', () => {
  expect(measureDiameter(new Vector3(-2, 0, 0), new Vector3(2, 0, 0), 'mm').value).toBe(4)
})

test('measures angle and closed polygon area', () => {
  expect(measureAngle(new Vector3(1, 0, 0), new Vector3(), new Vector3(0, 1, 0)).value).toBe(90)
  expect(measureClosedArea([
    new Vector3(0, 0, 0), new Vector3(2, 0, 0), new Vector3(2, 2, 0), new Vector3(0, 2, 0),
  ], 'mm').value).toBe(4)
})
