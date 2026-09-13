import { useRef, useState } from 'react'
import type { ViewerManifest } from '../../api/sharedViewer'
import type { ToolbarAction } from './toolbarDefinitions'
import type { ViewerMode, ViewerTool } from './viewer.store'
import { ContextToolbar } from './ContextToolbar'
import { CtViewer } from './ct/CtViewer'
import type { CtOrientation } from './ct/ctSlice'
import { LayerBottomSheet } from './LayerBottomSheet'
import { FixedAnatomyStrip } from './FixedAnatomyStrip'
import { OrientationWidget } from './OrientationWidget'
import { PlanDrawer } from './PlanDrawer'
import { QuickActionRail } from './QuickActionRail'
import { ViewerCanvas, type ViewerCanvasHandle } from './ViewerCanvas'
import { ViewerIcon } from './ViewerIcon'
import type { ViewerView } from './ContextToolbar'

type ViewLayout = 'model' | 'image' | 'split'
interface ViewPresentation { layout: ViewLayout; orientation?: CtOrientation }

const viewPresentations: Record<ViewerView, ViewPresentation> = {
  三维: { layout: 'model' },
  影像: { layout: 'image', orientation: 'axial' },
  '三维+横断面': { layout: 'split', orientation: 'axial' },
  冠状面: { layout: 'image', orientation: 'coronal' },
  矢状面: { layout: 'image', orientation: 'sagittal' },
  '三维+冠状面': { layout: 'split', orientation: 'coronal' },
  '三维+矢状面': { layout: 'split', orientation: 'sagittal' },
  '三维+AR': { layout: 'model' },
  裁剪框: { layout: 'model' },
}

export function ViewerShell({ manifest }: { manifest: ViewerManifest }) {
  const [mode, setMode] = useState<ViewerMode>('browse')
  const [activeTool, setActiveTool] = useState<ViewerTool | null>(null)
  const [hidden, setHidden] = useState(new Set(manifest.layers.filter(layer => !layer.visible).map(layer => layer.id)))
  const [rotating, setRotating] = useState(false)
  const [darkBackground, setDarkBackground] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'model' | 'download'>('model')
  const [activeView, setActiveView] = useState<ViewerView>('三维')
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const engineRef = useRef<ViewerCanvasHandle | null>(null)
  const reset = () => {
    setRotating(false)
    setDarkBackground(false)
    setHidden(new Set(manifest.layers.filter(layer => !layer.visible).map(layer => layer.id)))
    setMode('browse')
    setActiveTool(null)
    setActiveView('三维')
    setViewMenuOpen(false)
    setPlanOpen(false)
    setLayersOpen(false)
    setSelectedCategory(null)
    engineRef.current?.setAutoRotate(false)
    engineRef.current?.setBackground('#d9d9d9')
    manifest.layers.forEach(layer => engineRef.current?.setVisible(layer.id, layer.visible))
    engineRef.current?.reset()
  }
  const action = (item: ToolbarAction) => {
    if (item.command === 'plan') return setPlanOpen(true)
    if (item.command === 'close') { engineRef.current?.activateTool(null); setMode('browse'); setActiveTool(null); return }
    if (item.command === 'undo' && activeTool === 'moveLayer') { engineRef.current?.toolCommand('undo'); return }
    if (item.command === 'reset') return reset()
    if (item.command === 'view') return setViewMenuOpen(value => !value)
    if (item.tool) {
      engineRef.current?.activateTool(item.tool)
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
  const toggleGroup = (ids: string[]) => setHidden(current => {
    const shouldShow = ids.some(id => current.has(id))
    const next = new Set(current)
    for (const id of ids) {
      if (shouldShow) next.delete(id)
      else next.add(id)
      engineRef.current?.setVisible(id, shouldShow)
    }
    return next
  })
  const presentation = viewPresentations[activeView]
  const showModel = presentation.layout !== 'image'
  const showImage = presentation.layout !== 'model'
  return <main className={`viewer-shell viewer-shell--${presentation.layout}${darkBackground ? ' viewer-shell--dark' : ''}`} aria-label={manifest.title}>
    <nav className="viewer-tabs" aria-label="内容类型">
      <button className={activeTab === 'model' ? 'is-active' : ''} aria-label="模型" onClick={() => setActiveTab('model')}>模型</button>
      <button className={activeTab === 'download' ? 'is-active' : ''} aria-label="下载" onClick={() => setActiveTab('download')}>下载</button>
    </nav>
    {activeTab === 'model' ? <>
      <ContextToolbar mode={mode} activeTool={activeTool} onAction={action} canSavePlan={manifest.permissions.savePlan} viewMenuOpen={viewMenuOpen} activeView={activeView} onSelectView={view => { setActiveView(view); setViewMenuOpen(false) }} />
      <section className={`viewer-workspace viewer-workspace--${presentation.layout}`} aria-label="模型工作区">
        {showModel && <section className="viewer-model-panel" data-testid="viewer-model-panel">
          <div className="viewer-stage">
            <ViewerCanvas manifest={manifest} engineRef={engineRef} hidden={hidden} />
            <OrientationWidget />
            <QuickActionRail rotating={rotating} moving={activeTool === 'moveLayer'} onRotate={() => { setRotating(value => { engineRef.current?.setAutoRotate(!value); return !value }) }} onMove={() => {
              const moving = activeTool !== 'moveLayer'
              setRotating(false)
              setMode(moving ? 'moveLayer' : 'browse'); setActiveTool(moving ? 'moveLayer' : null)
              engineRef.current?.activateTool(moving ? 'moveLayer' : null)
            }} onRestore={() => engineRef.current?.restoreLayerPositions()} onBackground={() => { setDarkBackground(value => { engineRef.current?.setBackground(value ? '#d9d9d9' : '#1d2630'); return !value }) }} />
            <button type="button" className="viewer-fab" aria-label="新建标注" onClick={() => { setMode('annotate'); setActiveTool('annotation') }}>
              <ViewerIcon name="pencil" size={24} />
            </button>
          </div>
        </section>}
        {showImage && presentation.orientation && <CtViewer
          key={`${presentation.orientation}:${manifest.volume?.descriptorUrl ?? 'none'}`}
          descriptorUrl={manifest.volume?.descriptorUrl ?? null}
          orientation={presentation.orientation}
        />}
      </section>
      {activeView === '三维' && <footer className="viewer-footer">
        <FixedAnatomyStrip layers={manifest.layers} hidden={hidden} selected={selectedCategory} onSelect={setSelectedCategory} onToggle={toggleGroup} />
        <button className="all-layers" onClick={() => setLayersOpen(true)}>全部分层</button>
      </footer>}
      <LayerBottomSheet open={layersOpen} layers={manifest.layers} hidden={hidden} onToggle={toggleLayer} onClose={() => setLayersOpen(false)} />
      <PlanDrawer open={planOpen} onClose={() => setPlanOpen(false)} />
    </> : <section className="download-panel" aria-label="下载内容"><h2>模型文件</h2><p>导出当前案例的模型文件和查看报告。</p><button disabled={!manifest.permissions.download}>下载模型</button></section>}
  </main>
}
