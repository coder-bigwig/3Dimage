export type DrawingKind = 'pen' | 'line' | 'arrow' | 'ellipse' | 'rectangle' | 'text'
export interface Point2 { x: number; y: number }
export interface Drawing { id: string; kind: DrawingKind; color: string; points: Point2[]; text: string }
export interface ModelAnnotation { id: string; layerId: string; position: [number, number, number]; text: string; offset: [number, number] }
export interface AnnotationContent { drawings: Drawing[]; models: ModelAnnotation[] }
export interface AnnotationDocument extends AnnotationContent { version: number }
