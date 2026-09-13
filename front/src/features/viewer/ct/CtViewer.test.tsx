import { fireEvent, render, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { expect, test } from 'vitest'
import { server } from '../../../test/server'
import { CtViewer } from './CtViewer'

const descriptor = {
  schemaVersion: 1, caseId: 'demo',
  dims: [3, 4, 6], spacing: [1, 1, 2], dataType: 'int16', byteOrder: 'little-endian',
  dataFile: 'volume.bin', huRange: [-1024, 3071], defaultWindow: { center: -600, width: 1600 },
  meta: { caseId: 'demo', seriesName: 'CT 胸部平扫（公开演示数据）', sliceThicknessMm: 2 },
}

const expectedToolbar = ['报告', '翻页', '移动', '缩放', '调窗', '宽位', '布局', '测量', '标注', 'Lut', '信息']

function mockVolume(url: string, payload: Int16Array) {
  server.use(
    http.get(`*${url}`, () => HttpResponse.json(descriptor)),
    http.get('*/volume.bin', () => HttpResponse.arrayBuffer(payload.buffer as ArrayBuffer)),
  )
}

test('renders the reference toolbar with real slices and overlay counters', async () => {
  mockVolume('/one/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/one/ct-volume.json" orientation="axial" />)

  const toolbar = await screen.findByRole('navigation', { name: '影像工具' })
  expect([...toolbar.querySelectorAll('button')].map(button => button.getAttribute('aria-label'))).toEqual(expectedToolbar)
  expect(toolbar.querySelector('button[aria-label="调窗"]')).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('toolbar', { name: '测量工具' })).not.toBeInTheDocument()

  const cell = await screen.findByTestId('ct-cell-axial')
  expect(within(cell).getByText('4/6')).toBeInTheDocument()
  expect(within(cell).getByText('W1600 C-600')).toBeInTheDocument()
  expect(within(cell).getByText('横断面')).toBeInTheDocument()
})

test('grows to three MPR panes from the layout menu', async () => {
  mockVolume('/two/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/two/ct-volume.json" orientation="axial" />)
  await screen.findByTestId('ct-cell-axial')
  expect(document.querySelectorAll('.ct-cell')).toHaveLength(1)

  fireEvent.click(screen.getByRole('button', { name: '布局' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: /3×1/ }))

  await screen.findByTestId('ct-cell-sagittal')
  expect(document.querySelectorAll('.ct-cell')).toHaveLength(3)
})

test('switches the window from the 宽位 menu and reflects it on the overlay', async () => {
  mockVolume('/three/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/three/ct-volume.json" orientation="axial" />)
  await screen.findByTestId('ct-cell-axial')

  fireEvent.click(screen.getByRole('button', { name: '宽位' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: /脑窗/ }))

  expect(await screen.findByText('W70 C30')).toBeInTheDocument()
})

// jsdom has no ResizeObserver and no 2D canvas, so CtCell falls back to an
// identity transform: two clicks at (10,20) and (40,60) span 30 and 40 slice
// pixels, which is a 3-4-5 triangle of 50 mm at spacing (1, 1).
function clickSlice(u: number, v: number) {
  const canvas = screen.getByTestId('ct-cell-axial').querySelector('canvas')!
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: u, clientY: v })
}

test('measures a length with two clicks and lists it in the report', async () => {
  mockVolume('/four/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/four/ct-volume.json" orientation="axial" />)
  await screen.findByTestId('ct-cell-axial')

  fireEvent.click(screen.getByRole('button', { name: '测量' }))
  const subtoolbar = await screen.findByRole('toolbar', { name: '测量工具' })
  expect(within(subtoolbar).getByRole('button', { name: '撤销' })).toBeDisabled()
  expect(within(subtoolbar).getByRole('button', { name: '清空' })).toBeDisabled()

  clickSlice(10, 20)
  clickSlice(40, 60)

  expect(within(subtoolbar).getByRole('button', { name: '撤销' })).not.toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: '报告' }))
  const report = await screen.findByRole('region', { name: '测量报告' })
  expect(report.textContent).toContain('横断面 第 4 张')
  expect(report.textContent).toContain('50.00 mm')
})

test('undoes and clears measurements from the measure sub-toolbar', async () => {
  mockVolume('/five/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/five/ct-volume.json" orientation="axial" />)
  await screen.findByTestId('ct-cell-axial')
  fireEvent.click(screen.getByRole('button', { name: '测量' }))
  const subtoolbar = await screen.findByRole('toolbar', { name: '测量工具' })

  clickSlice(10, 20)
  clickSlice(40, 60)
  clickSlice(0, 0)
  clickSlice(6, 8)
  await within(subtoolbar).findByRole('button', { name: '撤销' })

  fireEvent.click(screen.getByRole('button', { name: '报告' }))
  expect((await screen.findByRole('region', { name: '测量报告' })).querySelectorAll('li')).toHaveLength(2)

  fireEvent.click(within(subtoolbar).getByRole('button', { name: '撤销' }))
  expect(screen.getByRole('region', { name: '测量报告' }).querySelectorAll('li')).toHaveLength(1)

  fireEvent.click(within(subtoolbar).getByRole('button', { name: '清空' }))
  expect(screen.getByText('暂无测量或标注记录。')).toBeInTheDocument()
})

test('measures an angle with three clicks and an area by closing the polygon', async () => {
  mockVolume('/seven/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/seven/ct-volume.json" orientation="axial" />)
  await screen.findByTestId('ct-cell-axial')

  fireEvent.click(screen.getByRole('button', { name: '测量' }))
  const subtoolbar = await screen.findByRole('toolbar', { name: '测量工具' })

  // 角度：顶点 (10,10)，两臂沿 u 与 v 方向 → 90°
  fireEvent.click(within(subtoolbar).getByRole('button', { name: '角度' }))
  clickSlice(10, 10)
  clickSlice(40, 10)
  clickSlice(10, 30)

  // 面积：一个 10×10 的方形（轴向间距 1mm → 100 mm²）
  fireEvent.click(within(subtoolbar).getByRole('button', { name: '面积' }))
  clickSlice(0, 0)
  clickSlice(0, 10)
  clickSlice(10, 10)
  clickSlice(10, 0)
  clickSlice(0, 0) // 回到起点闭合

  fireEvent.click(screen.getByRole('button', { name: '报告' }))
  const report = await screen.findByRole('region', { name: '测量报告' })
  expect(report.textContent).toContain('角度 90.0°')
  expect(report.textContent).toContain('面积 1.00 cm²')
})

test('places a text annotation and lists it in the report', async () => {
  mockVolume('/six/ct-volume.json', Int16Array.from(new Array(72).fill(-860)))

  render(<CtViewer descriptorUrl="/six/ct-volume.json" orientation="axial" />)
  await screen.findByTestId('ct-cell-axial')

  fireEvent.click(screen.getByRole('button', { name: '标注' }))
  clickSlice(30, 30)

  const input = await screen.findByLabelText('标注文字')
  fireEvent.change(input, { target: { value: '可疑结节' } })
  fireEvent.keyDown(input, { key: 'Enter' })

  fireEvent.click(screen.getByRole('button', { name: '报告' }))
  const report = await screen.findByRole('region', { name: '测量报告' })
  expect(report.textContent).toContain('横断面 第 4 张')
  expect(report.textContent).toContain('可疑结节')
})

test('reports the error message when the volume cannot be loaded', async () => {
  server.use(http.get('*/broken/ct-volume.json', () => HttpResponse.json({}, { status: 404 })))

  render(<CtViewer descriptorUrl="/broken/ct-volume.json" orientation="axial" />)

  expect(await screen.findByText('二维影像加载失败')).toBeInTheDocument()
})

test('explains that a model-only result has no 2D volume', () => {
  render(<CtViewer descriptorUrl={null} orientation="axial" />)

  expect(screen.getByText('该结果没有附带二维 CT 影像数据。')).toBeInTheDocument()
})
