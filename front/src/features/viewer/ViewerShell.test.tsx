import { fireEvent, render, screen } from '@testing-library/react'
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

test('switches to the complete measurement toolbar', () => {
  render(<ViewerShell manifest={manifest} />)
  fireEvent.click(screen.getByRole('button', { name: '测量' }))
  for (const label of ['新建', '撤销', '清空', '闭合', '长度', '直径', '关闭']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
  }
  expect(screen.queryByRole('button', { name: '方案' })).not.toBeInTheDocument()
})

test('toggles a layer from the measurement strip', () => {
  render(<ViewerShell manifest={manifest} />)
  const toggle = screen.getByRole('button', { name: '隐藏 rs1' })
  fireEvent.click(toggle)
  expect(screen.getByRole('button', { name: '显示 rs1' })).toBeInTheDocument()
})
