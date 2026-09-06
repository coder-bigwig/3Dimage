import { createStore } from 'zustand/vanilla'

export type ViewerMode = 'browse' | 'measure' | 'annotate' | 'moveLayer' | 'clip'
export type ViewerTool = 'length' | 'diameter' | 'angle' | 'closedArea' | 'annotation' | 'moveLayer' | 'clipPlane'

interface ViewerState {
  mode: ViewerMode
  activeTool: ViewerTool | null
  selectedLayerId: string | null
  pendingPoints: number
  activateTool(tool: ViewerTool): void
  closeToolMode(): void
  selectLayer(id: string | null): void
  setPendingPoints(count: number): void
}

const modeForTool: Record<ViewerTool, ViewerMode> = {
  length: 'measure', diameter: 'measure', angle: 'measure', closedArea: 'measure',
  annotation: 'annotate', moveLayer: 'moveLayer', clipPlane: 'clip',
}

export function createViewerStore() {
  return createStore<ViewerState>((set) => ({
    mode: 'browse',
    activeTool: null,
    selectedLayerId: null,
    pendingPoints: 0,
    activateTool: (tool) => set({ mode: modeForTool[tool], activeTool: tool, pendingPoints: 0 }),
    closeToolMode: () => set({ mode: 'browse', activeTool: null, pendingPoints: 0 }),
    selectLayer: (selectedLayerId) => set({ selectedLayerId }),
    setPendingPoints: (pendingPoints) => set({ pendingPoints }),
  }))
}

export type ViewerStore = ReturnType<typeof createViewerStore>
export const viewerStore = createViewerStore()
