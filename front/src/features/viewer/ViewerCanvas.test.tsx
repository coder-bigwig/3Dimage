import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { ViewerManifest } from '../../api/sharedViewer'
import { ViewerCanvas } from './ViewerCanvas'

const { mockedEngine } = vi.hoisted(() => ({
  mockedEngine: {
    load: vi.fn(async () => undefined),
    dispose: vi.fn(),
    layerSnapshots: vi.fn(() => [{ loadState: 'error' }]),
  },
}))

vi.mock('../../../packages/rendering-core/src/ViewerEngine', () => ({
  ViewerEngine: vi.fn(function () { return mockedEngine }),
}))

const manifest: ViewerManifest = {
  resultId: 'result-1', title: '肺部三维重建', unit: 'mm', coordinateSystem: 'LPS', manifestVersion: 1,
  permissions: { view: true, measure: true, annotate: false, savePlan: false, download: false },
  layers: [{ id: 'right-upper-lobe', parentId: null, code: 'RUL', name: '右上叶', color: '#e543d7', opacity: .72, visible: true, volumeMl: 115.26, sortOrder: 1, assets: { medium: '/missing.glb' } }],
}

beforeEach(() => {
  mockedEngine.load.mockClear()
  mockedEngine.dispose.mockClear()
})

test('shows a model resource error instead of a fake model when all layers fail', async () => {
  const engineRef = { current: null }
  render(<ViewerCanvas manifest={manifest} engineRef={engineRef} />)

  await waitFor(() => expect(screen.getByText('模型资源未加载')).toBeVisible())
  expect(mockedEngine.load).toHaveBeenCalledWith(expect.objectContaining({ coordinateSystem: 'LPS' }))
  expect(screen.getByTestId('viewer-canvas')).toHaveAttribute('data-load-state', 'error')
})
