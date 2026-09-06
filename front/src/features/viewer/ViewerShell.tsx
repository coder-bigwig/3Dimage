import { useRef, useState } from 'react'
import type { ViewerManifest } from '../../api/sharedViewer'
import type { ToolbarAction } from './toolbarDefinitions'
import type { ViewerMode, ViewerTool } from './viewer.store'
import { AnatomyGroupStrip } from './AnatomyGroupStrip'
import { ContextToolbar } from './ContextToolbar'
import { LayerBottomSheet } from './LayerBottomSheet'
import { MeasurementStrip } from './MeasurementStrip'
import { OrientationWidget } from './OrientationWidget'
import { PlanDrawer } from './PlanDrawer'
import { QuickActionRail } from './QuickActionRail'
import { ViewerCanvas, type ViewerCanvasHandle } from './ViewerCanvas'

export function ViewerShell({ manifest }: { manifest: ViewerManifest }) {
  const [mode, setMode] = useState<ViewerMode>('browse')
  const [activeTool, setActiveTool] = useState<ViewerTool | null>(null)
  const [hidden, setHidden] = useState(new Set<string>())
  const [rotating, setRotating] = useState(false)
  const [darkBackground, setDarkBackground] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const engineRef = useRef<ViewerCanvasHandle | null>(null)
  const action = (item: ToolbarAction) => {
    if (item.command === 'plan') return setPlanOpen(true)
    if (item.command === 'close') { setMode('browse'); setActiveTool(null); return }
    if (item.command === 'reset') return engineRef.current?.reset()
    if (item.tool) {
      setActiveTool(item.tool)
      setMode(item.tool === 'moveLayer' ? 'moveLayer' : item.tool === 'annotation' ? 'annotate' : item.tool === 'clipPlane' ? 'clip' : 'measure')
    }
  }
  const toggleLayer = (id: string) => setHidden(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    engineRef.current?.setVisible(id, !next.has(id))
    return next
  })
  return <main className={`viewer-shell${darkBackground ? ' viewer-shell--dark' : ''}`} aria-label={manifest.title}>
    <ContextToolbar mode={mode} activeTool={activeTool} onAction={action} />
    <section className="viewer-stage">
      <ViewerCanvas manifest={manifest} engineRef={engineRef} />
      <OrientationWidget />
      <QuickActionRail rotating={rotating} onRotate={() => { setRotating(value => { engineRef.current?.setAutoRotate(!value); return !value }) }} onReset={() => engineRef.current?.reset()} onBackground={() => { setDarkBackground(value => { engineRef.current?.setBackground(value ? '#d9d9d9' : '#1d2630'); return !value }) }} />
    </section>
    <footer className="viewer-footer">
      <MeasurementStrip layers={manifest.layers} hidden={hidden} onToggle={toggleLayer} />
      <AnatomyGroupStrip />
      <button className="all-layers" onClick={() => setLayersOpen(true)}>全部分层</button>
    </footer>
    <LayerBottomSheet open={layersOpen} layers={manifest.layers} onClose={() => setLayersOpen(false)} />
    <PlanDrawer open={planOpen} onClose={() => setPlanOpen(false)} />
  </main>
}
