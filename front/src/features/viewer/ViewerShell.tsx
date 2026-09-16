import { useEffect, useRef, useState } from 'react'
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
import { AnnotationToolbar } from './annotations/AnnotationToolbar'
import { DrawingCanvas } from './annotations/DrawingCanvas'
import { useAnnotations } from './annotations/useAnnotations'
import type { Drawing, DrawingKind, ModelAnnotation } from './annotations/types'
import type { ToolRecord } from '../../../packages/rendering-core/src/tools/ToolRecords'
import type { ToolUpdate } from '../../../packages/rendering-core/src/tools/InteractiveTools'
import './annotations/annotations.css'

const modelRecords = (models: ModelAnnotation[]): ToolRecord[] => models.map(item => ({ id: item.id, tool: 'annotation', label: item.text, labelOffset: item.offset, points: [{ layerId: item.layerId, position: item.position }] }))

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

export function ViewerShell({ manifest, shareToken }: { manifest: ViewerManifest; shareToken?: string }) {
  const annotations = useAnnotations(manifest.resultId, shareToken)
  const [annotationMode, setAnnotationMode] = useState<'2d' | '3d' | null>(null)
  const [drawingKind, setDrawingKind] = useState<DrawingKind>('pen'), [color, setColor] = useState('#ff0000')
  const [annotationText, setAnnotationText] = useState(''), [selectedAnnotation, setSelectedAnnotation] = useState('')
  const [annotationMessage, setAnnotationMessage] = useState('')
  const drawingHistory = useRef<Drawing[][]>([]), shellRef = useRef<HTMLElement>(null), modelReady = useRef(false)
  const [mode, setMode] = useState<ViewerMode>('browse')
  const [activeTool, setActiveTool] = useState<ViewerTool | null>(null)
  const [areaHintVisible, setAreaHintVisible] = useState(false)
  const areaHintTimer = useRef<number | undefined>(undefined)
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
  const hideAreaHint = () => {
    if (areaHintTimer.current !== undefined) window.clearTimeout(areaHintTimer.current)
    areaHintTimer.current = undefined
    setAreaHintVisible(false)
  }
  const showAreaHint = () => {
    if (areaHintTimer.current !== undefined) window.clearTimeout(areaHintTimer.current)
    setAreaHintVisible(true)
    areaHintTimer.current = window.setTimeout(() => {
      areaHintTimer.current = undefined
      setAreaHintVisible(false)
    }, 5000)
  }
  useEffect(() => () => { if (areaHintTimer.current !== undefined) window.clearTimeout(areaHintTimer.current) }, [])
  useEffect(() => {
    const shell = shellRef.current
    const ready = () => {
      engineRef.current?.restoreAnnotations(modelRecords(annotations.content.models))
      modelReady.current = true
      engineRef.current?.activateTool(annotationMode === '3d' && annotations.ready ? 'annotation' : activeTool)
    }
    const update = (event: Event) => {
      if (!modelReady.current || !annotations.ready) return
      const detail = (event as CustomEvent<ToolUpdate>).detail
      setAnnotationMessage(detail.message)
      const models = detail.items.filter(item => item.tool === 'annotation').map(item => ({ id: item.id, text: item.label, layerId: item.points[0].layerId, position: item.points[0].position, offset: item.labelOffset ?? [55, -45] as [number, number] }))
      annotations.change({ ...annotations.content, models })
    }
    const select = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      setSelectedAnnotation(id)
      const record = annotations.content.models.find(item => item.id === id)
      setAnnotationText(record?.text ?? (annotationText.trim() || '标注'))
    }
    shell?.addEventListener('viewer-ready', ready); shell?.addEventListener('viewer-tools', update); shell?.addEventListener('viewer-annotation-selected', select)
    return () => { shell?.removeEventListener('viewer-ready', ready); shell?.removeEventListener('viewer-tools', update); shell?.removeEventListener('viewer-annotation-selected', select) }
  }, [activeTool, annotationMode, annotationText, annotations])
  useEffect(() => {
    if (annotations.restored) {
      drawingHistory.current = []
      engineRef.current?.restoreAnnotations(modelRecords(annotations.restored.models))
    }
  }, [annotations.restored])
  useEffect(() => {
    if (annotationMode === '3d') engineRef.current?.activateTool(annotations.ready ? 'annotation' : null)
  }, [annotationMode, annotations.ready])
  const startAnnotation = (value: '2d' | '3d') => {
    if (!manifest.permissions.annotate) return
    setAnnotationMode(value); setMode('annotate'); setActiveTool(value === '3d' ? 'annotation' : null)
    setActiveView('三维'); setViewMenuOpen(false); setRotating(false); setSelectedAnnotation(''); setAnnotationText('')
    engineRef.current?.setAnnotationText(''); engineRef.current?.activateTool(value === '3d' && annotations.ready ? 'annotation' : null)
  }
  const changeDrawings = (drawings: Drawing[]) => {
    drawingHistory.current.push(structuredClone(annotations.content.drawings))
    if (drawingHistory.current.length > 100) drawingHistory.current.shift()
    annotations.change({ ...annotations.content, drawings })
  }
  const closeAnnotation = () => { setAnnotationMode(null); setMode('browse'); setActiveTool(null); engineRef.current?.activateTool(null); void annotations.retry() }
  const reset = () => {
    setAnnotationMode(null)
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
    if (item.command === 'close') { hideAreaHint(); engineRef.current?.activateTool(null); setMode('browse'); setActiveTool(null); return }
    if (item.command === 'undo' && activeTool === 'moveLayer') { engineRef.current?.toolCommand('undo'); return }
    if (item.command === 'new' || item.command === 'undo' || item.command === 'clear' || item.command === 'finish') { engineRef.current?.toolCommand(item.command); return }
    if (item.command === 'reset') return reset()
    if (item.command === 'view') return setViewMenuOpen(value => !value)
    if (item.tool) {
      engineRef.current?.activateTool(item.tool)
      setActiveTool(item.tool)
      setMode(item.tool === 'moveLayer' ? 'moveLayer' : item.tool === 'annotation' ? 'annotate' : item.tool === 'clipPlane' ? 'clip' : 'measure')
      if (item.tool === 'closedArea') showAreaHint()
      else hideAreaHint()
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
  return <main ref={shellRef} className={`viewer-shell viewer-shell--${presentation.layout}${annotationMode ? ' viewer-shell--annotating' : ''}${darkBackground ? ' viewer-shell--dark' : ''}`} aria-label={manifest.title}>
    <nav className="viewer-tabs" aria-label="内容类型">
      <button className={activeTab === 'model' ? 'is-active' : ''} aria-label="模型" onClick={() => setActiveTab('model')}>模型</button>
      <button className={activeTab === 'download' ? 'is-active' : ''} aria-label="下载" onClick={() => { modelReady.current = false; closeAnnotation(); setActiveTab('download') }}>下载</button>
    </nav>
    {activeTab === 'model' ? <>
      {annotationMode ? <div className="annotation-controls">
        <AnnotationToolbar mode={annotationMode} color={color} kind={drawingKind} text={annotationText} selected={annotations.content.models.some(item => item.id === selectedAnnotation)} ready={annotations.ready}
          onColor={setColor} onKind={setDrawingKind} onText={text => {
            setAnnotationText(text); engineRef.current?.setAnnotationText(text)
            if (selectedAnnotation) {
              if (text.trim()) { setAnnotationMessage(''); engineRef.current?.editAnnotation(selectedAnnotation, text) }
              else setAnnotationMessage('标注文字不能为空，原标注尚未更改')
            }
          }} onDelete={() => { engineRef.current?.removeRecord(selectedAnnotation); setSelectedAnnotation(''); setAnnotationText(''); engineRef.current?.setAnnotationText('') }}
          onUndo={() => {
            if (annotationMode === '2d') { const previous = drawingHistory.current.pop(); if (previous) annotations.change({ ...annotations.content, drawings: previous }) }
            else { engineRef.current?.toolCommand('undo'); setSelectedAnnotation(''); setAnnotationText(''); engineRef.current?.setAnnotationText('') }
          }} onClear={() => {
            if (annotationMode === '2d') changeDrawings([])
            else { engineRef.current?.toolCommand('clear'); setSelectedAnnotation(''); setAnnotationText(''); engineRef.current?.setAnnotationText('') }
          }} onClose={closeAnnotation} />
        <div className="annotation-save-status" role={annotations.error ? 'alert' : 'status'}>{annotations.status}{annotationMessage && <span> · {annotationMessage}</span>}
          {annotations.error && <>{annotations.ready && <button onClick={() => void annotations.retry()}>重试保存</button>}<button onClick={() => { if (!annotations.ready || window.confirm('重新加载会丢弃尚未保存的标注修改，继续吗？')) void annotations.reload() }}>重新加载</button></>}
        </div>
      </div> : <ContextToolbar mode={mode} activeTool={activeTool} onAction={action} canSavePlan={manifest.permissions.savePlan} canAnnotate={manifest.permissions.annotate} onAnnotate={startAnnotation} viewMenuOpen={viewMenuOpen} activeView={activeView} onSelectView={view => { if (!showModel || viewPresentations[view].layout === 'image') modelReady.current = false; setActiveView(view); setViewMenuOpen(false) }} />}
      <section className={`viewer-workspace viewer-workspace--${presentation.layout}`} aria-label="模型工作区">
        {showModel && <section className="viewer-model-panel" data-testid="viewer-model-panel">
          <div className="viewer-stage">
            {areaHintVisible && <div className="measurement-help" role="status" aria-label="面积测量提示" aria-live="polite">请在模型表面点击至少 3 个点，然后点击“完成”</div>}
            <ViewerCanvas manifest={manifest} engineRef={engineRef} hidden={hidden} />
            {annotationMode === '2d' && <DrawingCanvas drawings={annotations.content.drawings} kind={drawingKind} color={color} enabled={annotations.ready} onAdd={drawing => {
              if (annotations.content.drawings.length >= 200 || annotations.content.drawings.reduce((sum, item) => sum + item.points.length, 0) + drawing.points.length > 20000) { setAnnotationMessage('二维标注数量已达保存上限，请先清空部分标注'); return }
              changeDrawings([...annotations.content.drawings, drawing])
            }} />}
            <OrientationWidget />
            <QuickActionRail rotating={rotating} moving={activeTool === 'moveLayer'} onRotate={() => { setRotating(value => { engineRef.current?.setAutoRotate(!value); return !value }) }} onMove={() => {
              const moving = activeTool !== 'moveLayer'
              setRotating(false)
              setMode(moving ? 'moveLayer' : 'browse'); setActiveTool(moving ? 'moveLayer' : null)
              engineRef.current?.activateTool(moving ? 'moveLayer' : null)
            }} onRestore={() => engineRef.current?.restoreLayerPositions()} onBackground={() => { setDarkBackground(value => { engineRef.current?.setBackground(value ? '#d9d9d9' : '#1d2630'); return !value }) }} />
            <button type="button" disabled={!manifest.permissions.annotate} className="viewer-fab" aria-label="新建标注" onClick={() => startAnnotation('3d')}>
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
