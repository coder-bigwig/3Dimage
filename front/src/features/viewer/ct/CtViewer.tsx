import { useEffect, useMemo, useRef, useState } from 'react'
import { ViewerIcon, type ViewerIconName } from '../ViewerIcon'
import { loadCtVolumeCached, type CtVolume } from './ctVolume'
import { ctOrientationLabels, slicePlane, type CtOrientation } from './ctSlice'
import { ctLutNames, lutPreviewGradient, type CtLutName } from './ctLut'
import { ctWindowOptions, resolveWindowOption, type CtWindowState } from './ctPresets'
import { ctMeasureKindLabels, formatMeasure, type CtMeasure, type CtMeasureKind, type CtTextAnnotation } from './ctMeasure'
import { CtCell, type CtToolMode } from './CtCell'

type LoadState = { status: 'loading' } | { status: 'ready'; volume: CtVolume } | { status: 'error'; message: string }

type CtLayout = '1x1' | '2x1' | '3x1' | '2x2'
const ctPlanes: readonly CtOrientation[] = ['axial', 'coronal', 'sagittal']

type CtToolId = CtToolMode | 'report' | 'presets' | 'layout' | 'lut' | 'info'

const ctToolbar: readonly { id: CtToolId; label: string; icon: ViewerIconName }[] = [
  { id: 'report', label: '报告', icon: 'plan' },
  { id: 'page', label: '翻页', icon: 'page' },
  { id: 'pan', label: '移动', icon: 'move' },
  { id: 'zoom', label: '缩放', icon: 'zoom' },
  { id: 'window', label: '调窗', icon: 'window' },
  { id: 'presets', label: '宽位', icon: 'presets' },
  { id: 'layout', label: '布局', icon: 'layout' },
  { id: 'measure', label: '测量', icon: 'measure' },
  { id: 'mark', label: '标注', icon: 'annotation' },
  { id: 'lut', label: 'Lut', icon: 'lut' },
  { id: 'info', label: '信息', icon: 'info' },
] as const

const layoutOptions: readonly { id: CtLayout; label: string; hint: string }[] = [
  { id: '1x1', label: '1×1', hint: '单平面' },
  { id: '2x1', label: '2×1', hint: '双平面' },
  { id: '3x1', label: '3×1', hint: 'MPR 三平面' },
  { id: '2x2', label: '2×2', hint: '四宫格' },
] as const

const measureHints: Record<CtMeasureKind, string> = {
  length: '在影像上点击两点测量长度',
  diameter: '在影像上点击两点测量直径',
  angle: '先点击顶点，再点击两个端点',
  area: '依次点击围成区域，双击或点回起点闭合',
}

const isToolMode = (id: CtToolId): id is CtToolMode =>
  id === 'page' || id === 'pan' || id === 'zoom' || id === 'window' || id === 'measure' || id === 'mark'
const hasMenu = (id: CtToolId): id is 'presets' | 'layout' | 'lut' => id === 'presets' || id === 'layout' || id === 'lut'

function cellOrientations(layout: CtLayout, primary: CtOrientation): CtOrientation[] {
  if (layout === '1x1') return [primary]
  if (layout === '2x1') return [primary, ctPlanes.find(plane => plane !== primary) ?? 'coronal']
  if (layout === '3x1') return [...ctPlanes]
  return ['axial', 'coronal', 'sagittal', 'axial']
}

export function CtViewer({ descriptorUrl, orientation }: { descriptorUrl?: string | null; orientation: CtOrientation }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [layout, setLayout] = useState<CtLayout>('1x1')
  const [indexOverrides, setIndexOverrides] = useState<Partial<Record<CtOrientation, number>>>({})
  const [windowOverride, setWindowOverride] = useState<CtWindowState | null>(null)
  const [lut, setLut] = useState<CtLutName>('plain')
  const [mode, setMode] = useState<CtToolMode>('window')
  const [openMenu, setOpenMenu] = useState<'presets' | 'layout' | 'lut' | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [measureKind, setMeasureKind] = useState<CtMeasureKind>('length')
  const [measurements, setMeasurements] = useState<CtMeasure[]>([])
  const [annotations, setAnnotations] = useState<CtTextAnnotation[]>([])
  const idRef = useRef(0)
  const toolbarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!descriptorUrl) return
    let cancelled = false
    loadCtVolumeCached(descriptorUrl)
      .then(volume => { if (!cancelled) setState({ status: 'ready', volume }) })
      .catch(error => { if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : '影像加载失败' }) })
    return () => { cancelled = true }
  }, [descriptorUrl])

  useEffect(() => {
    if (!openMenu) return
    const onPointerDown = (event: PointerEvent) => { if (!toolbarRef.current?.contains(event.target as Node)) setOpenMenu(null) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenMenu(null) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [openMenu])

  const cells = useMemo(() => cellOrientations(layout, orientation), [layout, orientation])

  if (!descriptorUrl) {
    return <section className="ct-viewer ct-viewer--empty" aria-label="二维影像">
      <p>该结果没有附带二维 CT 影像数据。</p>
      <small>公开数据流程会同时生成 3D 模型与 2D 体数据；分享结果由后端 manifest 的 volume 字段提供。</small>
    </section>
  }

  if (state.status === 'error') {
    return <section className="ct-viewer ct-viewer--empty" aria-label="二维影像">
      <p>二维影像加载失败</p>
      <small>{state.message}</small>
    </section>
  }

  if (state.status !== 'ready') {
    return <section className="ct-viewer ct-viewer--empty" aria-label="二维影像" aria-live="polite">
      <span className="share-state__loader" aria-hidden="true" />
      <p>正在加载 CT 体数据…</p>
    </section>
  }

  const volume = state.volume
  const fallbackWindow = volume.descriptor.defaultWindow
  const activeWindow = windowOverride ?? fallbackWindow
  const indexFor = (plane: CtOrientation) => indexOverrides[plane] ?? Math.floor(slicePlane(volume, plane).count / 2)
  const primaryCount = slicePlane(volume, orientation).count
  const setIndexFor = (plane: CtOrientation, value: number) => setIndexOverrides(current => ({ ...current, [plane]: value }))
  const nextId = () => { idRef.current += 1; return idRef.current }

  const addMeasurement = (record: Omit<CtMeasure, 'id'>) => setMeasurements(list => [...list, { ...record, id: nextId() }])
  const addAnnotation = (record: Omit<CtTextAnnotation, 'id'>) => setAnnotations(list => [...list, { ...record, id: nextId() }])
  const undoMeasurement = () => setMeasurements(list => list.slice(0, -1))
  const clearMeasurements = () => setMeasurements([])

  const handleAction = (id: CtToolId) => {
    if (hasMenu(id)) { setOpenMenu(current => (current === id ? null : id)); return }
    if (id === 'info') { setShowInfo(value => !value); return }
    if (id === 'report') { setShowReport(value => !value); return }
    if (isToolMode(id)) setMode(id)
  }

  const menuFor = (id: CtToolId) => {
    if (!hasMenu(id) || openMenu !== id) return null
    if (id === 'presets') {
      return <ul className="ct-menu" role="menu" aria-label="宽位">
        {ctWindowOptions.map(option => <li key={option.key}>
          <button type="button" role="menuitem" onClick={() => { setWindowOverride(resolveWindowOption(option, fallbackWindow)); setOpenMenu(null) }}>
            <span>{option.label}</span>{option.hint && <small>{option.hint}</small>}
          </button>
        </li>)}
      </ul>
    }
    if (id === 'layout') {
      return <ul className="ct-menu" role="menu" aria-label="布局">
        {layoutOptions.map(option => <li key={option.id}>
          <button type="button" role="menuitem" aria-pressed={layout === option.id} className={layout === option.id ? 'is-selected' : ''} onClick={() => { setLayout(option.id); setOpenMenu(null) }}>
            <span>{option.label}</span><small>{option.hint}</small>
          </button>
        </li>)}
      </ul>
    }
    return <ul className="ct-menu ct-menu--lut" role="menu" aria-label="Lut">
      {ctLutNames.map(name => <li key={name}>
        <button type="button" role="menuitem" aria-pressed={lut === name} className={lut === name ? 'is-selected' : ''} onClick={() => { setLut(name); setOpenMenu(null) }}>
          <i style={{ background: lutPreviewGradient(name) }} aria-hidden="true" /><span>{name}</span>
        </button>
      </li>)}
    </ul>
  }

  return <section className="ct-viewer" aria-label="二维影像">
    <nav className="ct-toolbar" ref={toolbarRef} aria-label="影像工具">
      {ctToolbar.map(item => {
        const active = (isToolMode(item.id) && mode === item.id) || (item.id === 'info' && showInfo) || (item.id === 'report' && showReport) || (openMenu === item.id)
        return <span className="ct-toolbar__item" key={item.id}>
          <button
            type="button"
            className={active ? 'is-active' : ''}
            aria-label={item.label}
            aria-expanded={hasMenu(item.id) ? openMenu === item.id : undefined}
            aria-pressed={isToolMode(item.id) ? mode === item.id : item.id === 'info' || item.id === 'report' ? (item.id === 'info' ? showInfo : showReport) : undefined}
            onClick={() => handleAction(item.id)}
          >
            <ViewerIcon name={item.icon} size={22} /><small>{item.label}</small>
          </button>
          {menuFor(item.id)}
        </span>
      })}
    </nav>

    {mode === 'measure' && <div className="ct-subtoolbar" role="toolbar" aria-label="测量工具">
      <span className="ct-subtoolbar__hint">{measureHints[measureKind]}</span>
      <span className="ct-subtoolbar__spacer" />
      {(Object.keys(ctMeasureKindLabels) as CtMeasureKind[]).map(kind => <button
        key={kind}
        type="button"
        aria-label={ctMeasureKindLabels[kind]}
        aria-pressed={measureKind === kind}
        className={measureKind === kind ? 'is-active' : ''}
        onClick={() => setMeasureKind(kind)}
      >{ctMeasureKindLabels[kind]}</button>)}
      <button type="button" aria-label="撤销" onClick={undoMeasurement} disabled={measurements.length === 0}><ViewerIcon name="undo" size={18} />撤销</button>
      <button type="button" aria-label="清空" onClick={clearMeasurements} disabled={measurements.length === 0}><ViewerIcon name="clear" size={18} />清空</button>
      <button type="button" aria-label="关闭测量" onClick={() => setMode('window')}><ViewerIcon name="close" size={18} />关闭</button>
    </div>}
    {mode === 'mark' && <div className="ct-subtoolbar" role="toolbar" aria-label="标注工具">
      <span className="ct-subtoolbar__hint">在影像上点击位置并输入文字</span>
    </div>}

    <div className="ct-slice-bar">
      <button type="button" aria-label="上一张" onClick={() => setIndexFor(orientation, Math.max(0, indexFor(orientation) - 1))}>‹</button>
      <input
        aria-label={`${ctOrientationLabels[orientation]}切片`}
        type="range" min={1} max={primaryCount} value={indexFor(orientation) + 1}
        onChange={event => setIndexFor(orientation, Number(event.target.value) - 1)}
      />
      <button type="button" aria-label="下一张" onClick={() => setIndexFor(orientation, Math.min(primaryCount - 1, indexFor(orientation) + 1))}>›</button>
      <span>{indexFor(orientation) + 1}/{primaryCount}</span>
    </div>

    <div className={`ct-grid ct-grid--${layout}`}>
      {cells.map((plane, position) => <CtCell
        key={`${plane}-${position}`}
        volume={volume}
        orientation={plane}
        index={indexFor(plane)}
        onIndexChange={value => setIndexFor(plane, value)}
        window={activeWindow}
        onWindowChange={setWindowOverride}
        lut={lut}
        mode={mode}
        measureKind={measureKind}
        showOverlay
        measurements={measurements.filter(record => record.plane === plane && record.sliceIndex === indexFor(plane))}
        annotations={annotations.filter(record => record.plane === plane && record.sliceIndex === indexFor(plane))}
        onAddMeasurement={addMeasurement}
        onAddAnnotation={addAnnotation}
      />)}
    </div>

    {showReport && <div className="ct-info ct-report" role="region" aria-label="测量报告">
      <h3>测量报告</h3>
      {measurements.length === 0 && annotations.length === 0 && <p>暂无测量或标注记录。</p>}
      {measurements.length > 0 && <>
        <h4>测量（{measurements.length}）</h4>
        <ul>
          {measurements.map(record => <li key={record.id}>
            {ctOrientationLabels[record.plane]} 第 {record.sliceIndex + 1} 张 · {ctMeasureKindLabels[record.kind]} {formatMeasure(record.kind, record.value)}
          </li>)}
        </ul>
      </>}
      {annotations.length > 0 && <>
        <h4>标注（{annotations.length}）</h4>
        <ul>
          {annotations.map(record => <li key={record.id}>
            {ctOrientationLabels[record.plane]} 第 {record.sliceIndex + 1} 张 · {record.text}
          </li>)}
        </ul>
      </>}
      <button type="button" onClick={() => setShowReport(false)}>关闭</button>
    </div>}

    {showInfo && <div className="ct-info" role="region" aria-label="影像信息">
      <h3>影像信息</h3>
      <dl>
        <div><dt>病例</dt><dd>{volume.descriptor.meta?.caseId ?? volume.descriptor.caseId}</dd></div>
        <div><dt>序列</dt><dd>{volume.descriptor.meta?.seriesName ?? '—'}</dd></div>
        <div><dt>矩阵</dt><dd>{volume.width}×{volume.height}×{volume.depth}</dd></div>
        <div><dt>体素</dt><dd>{volume.spacing.map(value => value.toFixed(2)).join(' × ')} mm</dd></div>
        <div><dt>HU 范围</dt><dd>{volume.descriptor.huRange.join(' ~ ')}</dd></div>
        <div><dt>窗宽窗位</dt><dd>W{activeWindow.width} / C{activeWindow.center}</dd></div>
      </dl>
      {volume.descriptor.meta?.note && <p>{volume.descriptor.meta.note}</p>}
      <button type="button" onClick={() => setShowInfo(false)}>关闭</button>
    </div>}
  </section>
}
