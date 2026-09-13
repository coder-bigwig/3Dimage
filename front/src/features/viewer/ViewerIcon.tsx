import type { ReactNode } from 'react'

export type ViewerIconName = 'reset' | 'segment' | 'plan' | 'annotation' | 'measure' | 'view' | 'new' | 'undo' | 'clear' | 'closed' | 'length' | 'diameter' | 'close' | 'rotate' | 'move' | 'background' | 'eye' | 'eye-off' | 'play' | 'pause' | 'pencil' | 'page' | 'zoom' | 'window' | 'presets' | 'layout' | 'lut' | 'info'

// Shapes mirror the reference viewer icon set: cube + circular arrow (reset),
// segmented sphere (segment), report sheet (plan), speech bubble (annotation),
// set square (measure) and an axonometric box with a lens (view).
const paths: Record<ViewerIconName, ReactNode> = {
  reset: <>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M16.4 2.5h3.6v3.6" />
    <path d="M12 8.8 15.3 10.7v3.8L12 16.4l-3.3-1.9v-3.8z" />
    <path d="M8.7 10.7 12 12.6l3.3-1.9M12 12.6v3.8" />
  </>,
  segment: <>
    <circle cx="12" cy="12" r="8.3" />
    <path d="M12 3.7c2.7 2.3 2.7 14.3 0 16.6" />
    <path d="M12 3.7c-2.7 2.3-2.7 14.3 0 16.6" />
    <path d="M4.6 7.7c3.5-1.9 11.3-1.9 14.8 0" />
  </>,
  plan: <>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </>,
  annotation: <>
    <path d="M4.5 7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v6.4a2.5 2.5 0 0 1-2.5 2.5h-7.3L5.6 20v-4H7a2.5 2.5 0 0 1-2.5-2.5z" />
    <path d="M8.4 8.6h7.2M8.4 11.7h4.6" />
  </>,
  measure: <>
    <path d="M5 19.5V4.5l15 15z" />
    <path d="M9 19.5V10.5l9 9z" />
  </>,
  view: <>
    <path d="M11 3.6 4.4 7.4v8L11 19.2l6.6-3.8v-8z" />
    <path d="M4.4 7.4 11 11.2l6.6-3.8M11 11.2v8" />
    <path d="M6.5 9.7 8.9 11.1M6.5 12.5 8.9 13.9M6.5 15.3 8.9 16.7" />
    <circle cx="17.2" cy="17.4" r="3.1" />
    <path d="M17.2 14.3v-1.1" />
  </>,
  new: <><path d="M12 5v14M5 12h14" /></>,
  undo: <><path d="M9 8 5 12l4 4" /><path d="M5 12h9a5 5 0 0 1 5 5" /></>,
  clear: <><path d="M6 7h12M9 7V4h6v3M8 7l1 13h6l1-13M10 10v7M14 10v7" /></>,
  closed: <><path d="M6 17c-2-5 2-10 7-9 4 1 5 6 2 9-3 3-8 2-9-2Z" /><path d="M12 8v8M8 12h8" /></>,
  length: <><path d="M5 19 19 5" /><path d="m7 17-2 2M9 15l2 2M13 11l2 2M17 7l2 2" /></>,
  diameter: <><path d="M5 19 19 5" /><path d="m5 14 5 5M14 5l5 5" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  rotate: <><path d="M20 11a8 8 0 1 0-2.4 5.7" /><path d="M20 5v6h-6" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="m8 7 4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" /></>,
  background: <><circle cx="12" cy="12" r="8" /><path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01" /></>,
  play: <><path fill="currentColor" stroke="none" d="M9 6.2 17.6 12 9 17.8z" /></>,
  pause: <><rect x="8.6" y="6.2" width="2.9" height="11.6" rx="1" fill="currentColor" stroke="none" /><rect x="13.6" y="6.2" width="2.9" height="11.6" rx="1" fill="currentColor" stroke="none" /></>,
  pencil: <><path d="M5 19l1.4-4.6L16.9 3.9a2 2 0 0 1 2.8 2.8L9.2 17.2 5 19Z" /><path d="m14.8 6 3.2 3.2" /></>,
  eye: <><path d="M2 12c2-4 5-6 10-6s8 2 10 6c-2 4-5 6-10 6s-8-2-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  'eye-off': <><path d="M3 3l18 18" /><path d="M2 12c2-4 5-6 10-6 1.1 0 2.2.1 3.1.4M6.2 16.2C4.3 15 2.8 13.4 2 12" /></>,
  page: <><rect x="5" y="4" width="14" height="16" rx="1.5" /><path d="m9 9.5 3-2.5 3 2.5M9 14.5l3 2.5 3-2.5" /></>,
  zoom: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.2 4.2M10.5 8v5M8 10.5h5" /></>,
  window: <><circle cx="12" cy="12" r="8.2" /><path d="M4 12h16M8.6 8.4 6 12l2.6 3.6M15.4 8.4 18 12l-2.6 3.6" /></>,
  presets: <><circle cx="12" cy="12" r="8.2" /><path fill="currentColor" stroke="none" d="M12 3.8a8.2 8.2 0 0 1 0 16.4Z" /></>,
  layout: <><rect x="4" y="4" width="7" height="7" rx="1.2" /><rect x="13" y="4" width="7" height="7" rx="1.2" /><rect x="4" y="13" width="7" height="7" rx="1.2" /><rect x="13" y="13" width="7" height="7" rx="1.2" /></>,
  lut: <><path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.6 0 2.4-1.1 2.4-2.2 0-1.4-1.2-1.9-1.2-3 0-1 .8-1.7 1.8-1.7h1.5A4.4 4.4 0 0 0 20.5 9c0-3.2-3.7-5.5-8.5-5.5Z" /><path d="M7.6 11h.01M10 7.8h.01M14 7.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="8.4" /><path d="M12 11.2v5.2M12 8.1h.01" /></>,
}

export function ViewerIcon({ name, size = 24 }: { name: ViewerIconName; size?: number }) {
  return <svg className="viewer-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
