import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { ViewerManifest } from '../../api/sharedViewer'
import { ViewerShell } from './ViewerShell'

const manifest: ViewerManifest = {
  resultId: 'result-1', title: '肺部三维重建', unit: 'mm', coordinateSystem: 'LPS', manifestVersion: 1,
  permissions: { view: true, measure: true, annotate: true, savePlan: true, download: false },
  layers: [
    { id: 'rs1', parentId: null, code: 'RUL', name: '右上', color: '#e543d7', opacity: .72, visible: true, volumeMl: 115.26, sortOrder: 1, assets: {} },
  ],
}

const manifestWithLongLayer: ViewerManifest = {
  ...manifest,
  permissions: { ...manifest.permissions, savePlan: false },
  layers: [
    { ...manifest.layers[0], id: 'layer-1', name: '右上叶肺段安全边界', volumeMl: null, visible: false },
  ],
}

test('selects a group and keeps mixed visibility in sync with the sheet and reset', () => {
  const layers = [
    { ...manifest.layers[0], id: 'rs1', code: 'RUL', name: '右上叶', volumeMl: 115.26, visible: true },
    { ...manifest.layers[0], id: 'rs2', code: 'RUL', name: '右上叶二段', volumeMl: 80, visible: false },
  ]
  render(<ViewerShell manifest={{ ...manifest, layers }} />)
  const strip = screen.getByRole('region', { name: '模型分层参考栏' })
  const group = within(strip).getByRole('button', { name: '选择 右上' })
  fireEvent.click(group)
  expect(group).toHaveAttribute('aria-pressed', 'true')
  const eye = within(strip).getByRole('button', { name: '显示 右上' })
  expect(eye).toHaveAttribute('aria-pressed', 'mixed')
  expect(within(strip).getByText('195.26ml')).toBeInTheDocument()
  fireEvent.click(eye)
  expect(within(strip).getByRole('button', { name: '隐藏 右上' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '全部分层' }))
  const sheet = screen.getByRole('region', { name: '全部分层' })
  expect(within(sheet).getByRole('button', { name: '隐藏 右上叶' })).toBeInTheDocument()
  expect(within(sheet).getByRole('button', { name: '隐藏 右上叶二段' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '重置' }))
  expect(within(strip).getByRole('button', { name: '显示 右上' })).toHaveAttribute('aria-pressed', 'mixed')
})

test('switches to the complete measurement toolbar', () => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '测量' }))
  for (const label of ['新建', '撤销', '清空', '闭合', '长度', '直径', '关闭']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  }
  expect(screen.queryByRole('button', { name: '方案' })).not.toBeInTheDocument()
})

test('renders the structure bar from manifest data with its real volume', () => {
  render(<ViewerShell manifest={manifest} />)
  const strip = screen.getByRole('region', { name: '模型分层参考栏' })
  expect(within(strip).getByText('右上')).toBeInTheDocument()
  expect(within(strip).getByText('115.26ml')).toBeInTheDocument()
  expect(within(strip).queryByText('3557.92ml')).not.toBeInTheDocument()
})

test('keeps the all-layers sheet synchronized with the strip', () => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '全部分层' }))
  const sheet = screen.getByRole('region', { name: '全部分层' })
  fireEvent.click(within(sheet).getByRole('button', { name: '隐藏 右上' }))
  expect(within(sheet).getByRole('button', { name: '显示 右上' })).toBeInTheDocument()
})

test('keeps the reference default toolbar order and labels', () => {
  render(<ViewerShell manifest={manifest} />)
  const toolbar = screen.getByRole('navigation', { name: '查看器工具' })
  expect([...toolbar.querySelectorAll('button')].map(button => button.textContent?.trim())).toEqual([
    '重置', '分段', '方案', '标注', '测量', '视图',
  ])
  expect(toolbar.querySelectorAll('svg')).toHaveLength(6)
})

test('shows the derived group name without exposing internal ids', () => {
  render(<ViewerShell manifest={manifestWithLongLayer} />)
  const strip = screen.getByRole('region', { name: '模型分层参考栏' })
  expect(within(strip).getByText('右上')).toBeInTheDocument()
  expect(screen.queryByText('layer-1')).not.toBeInTheDocument()
})

test('disables plan action when saving is not permitted', () => {
  render(<ViewerShell manifest={manifestWithLongLayer} />)
  expect(screen.getByRole('button', { name: '方案' })).toBeDisabled()
})

test('opens with the reference model-only layout', () => {
  render(<ViewerShell manifest={manifest} />)

  expect(screen.getByRole('button', { name: '模型' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '下载' })).toBeInTheDocument()
  expect(screen.getByTestId('viewer-model-panel')).toBeInTheDocument()
  expect(screen.queryByTestId('ct-preview')).not.toBeInTheDocument()
})

test.each(['重置'])('%s restores the default presentation', (button) => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '自动旋转' }))
  fireEvent.click(screen.getByRole('button', { name: '切换背景' }))
  fireEvent.click(screen.getByRole('button', { name: button }))
  expect(screen.getByRole('button', { name: '自动旋转' })).toBeInTheDocument()
  expect(screen.getByRole('main')).not.toHaveClass('viewer-shell--dark')
  expect(screen.queryByTestId('ct-preview')).not.toBeInTheDocument()
})

test('exposes the reference layout toolbar and quick rail', () => {
  render(<ViewerShell manifest={manifest} />)
  const toolbar = screen.getByRole('navigation', { name: '查看器工具' })
  expect([...toolbar.querySelectorAll('button')].map(button => button.textContent?.trim())).toEqual([
    '重置', '分段', '方案', '标注', '测量', '视图',
  ])
  const rail = screen.getByRole('complementary', { name: '快捷操作' })
  expect([...rail.querySelectorAll('button')].map(button => button.getAttribute('aria-label'))).toEqual([
    '自动旋转', '移动模型', '恢复模型位置', '切换背景',
  ])
  expect(screen.getByRole('button', { name: '新建标注' })).toBeInTheDocument()
})

test('opens the view menu and selects a layout', () => {
  render(<ViewerShell manifest={manifest} />)

  fireEvent.click(screen.getByRole('button', { name: '视图' }))
  expect(screen.getByRole('menu', { name: '视图模式' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('menuitem', { name: '影像' }))

  expect(screen.getByRole('button', { name: '视图：影像' })).toBeInTheDocument()
  expect(screen.queryByRole('menu', { name: '视图模式' })).not.toBeInTheDocument()
})

test('closes the view menu with Escape or an outside click', () => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '视图' }))
  expect(screen.getByRole('menu', { name: '视图模式' })).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menu', { name: '视图模式' })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '视图' }))
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('menu', { name: '视图模式' })).not.toBeInTheDocument()
})

test('activates move mode from the quick action rail', () => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '移动模型' }))
  expect(screen.getByRole('button', { name: '移动' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
})

test('shows a disabled save action in the plan drawer', () => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '方案' }))
  expect(screen.getByRole('complementary', { name: '方案管理' })).toBeInTheDocument()
  expect(within(screen.getByRole('complementary', { name: '方案管理' })).getByRole('button', { name: /保存新方案/ })).toBeDisabled()
})

test('switches the website content to the download tab', () => {
  render(<ViewerShell manifest={manifest} />)

  fireEvent.click(screen.getByRole('button', { name: '下载' }))

  expect(screen.getByRole('heading', { name: '模型文件' })).toBeInTheDocument()
  expect(screen.queryByTestId('viewer-model-panel')).not.toBeInTheDocument()
})
