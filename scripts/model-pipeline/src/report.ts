export interface Bounds { min: [number, number, number]; max: [number, number, number] }
export interface ConversionReport { schemaVersion: 1; sourceSha256: string; toolImageDigest: string; arguments: string[]; sourceBounds: Bounds; targetBounds: Bounds; sourceTriangles: number; targetTriangles: number; maxSampledVertexErrorMm: number; qualityPassed: boolean }

export function buildReport(report: Omit<ConversionReport, 'schemaVersion' | 'qualityPassed'>, maximumErrorMm: number): ConversionReport {
  const numeric = [...report.sourceBounds.min, ...report.sourceBounds.max, ...report.targetBounds.min, ...report.targetBounds.max, report.sourceTriangles, report.targetTriangles, report.maxSampledVertexErrorMm]
  if (numeric.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Conversion report contains invalid numbers')
  return { schemaVersion: 1, ...report, arguments: [...report.arguments], qualityPassed: report.maxSampledVertexErrorMm <= maximumErrorMm }
}
