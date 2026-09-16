import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from './App'
import { server } from '../test/server'

afterEach(() => { vi.unstubAllEnvs(); sessionStorage.clear() })

test('fresh Blender entry loads its real server case with working annotation modes', async () => {
  sessionStorage.clear()
  vi.stubEnv('VITE_ENABLE_BLENDER_DEMO', 'true')
  server.use(http.get('http://localhost:8080/api/v1/shared-viewers/demo-blender-token-000000000000000000/manifest', () => HttpResponse.json({
    resultId: 'blender-v2', title: 'Blender integrated', renderStyle: 'clinical', unit: 'mm', coordinateSystem: 'RAS', manifestVersion: 1,
    permissions: { view: true, measure: true, annotate: true, savePlan: true, download: false }, layers: [],
  })))
  renderApp('/share/viewer')
  expect(await screen.findByRole('main', { name: 'Blender integrated' })).toBeVisible()
  expect(screen.getByRole('button', { name: '标注' })).toBeEnabled()
})

test('a resumed share uses the server case instead of the static preview', async () => {
  vi.stubEnv('VITE_ENABLE_BLENDER_DEMO', 'true')
  sessionStorage.setItem('active-viewer-share', 'demo-valid-token-00000000000000000000')
  server.use(http.get('http://localhost:8080/api/v1/shared-viewers/:token/manifest', () => HttpResponse.json({
    resultId: 'test', title: '服务端分享案例', unit: 'mm', coordinateSystem: 'RAS', manifestVersion: 1,
    permissions: { view: true, measure: true, annotate: true, savePlan: true, download: false }, layers: [],
  })))
  renderApp('/share/viewer')
  expect(await screen.findByRole('main', { name: '服务端分享案例' })).toBeVisible()
})

test('fresh Blender entry ignores a stale invalid session token', async () => {
  vi.stubEnv('VITE_ENABLE_BLENDER_DEMO', 'true')
  sessionStorage.setItem('active-viewer-share', 'viewer')
  server.use(http.get('http://localhost:8080/api/v1/shared-viewers/demo-blender-token-000000000000000000/manifest', () => HttpResponse.json({
    resultId: 'blender-fallback', title: 'Blender fallback', renderStyle: 'clinical', unit: 'mm', coordinateSystem: 'RAS', manifestVersion: 1,
    permissions: { view: true, measure: true, annotate: true, savePlan: true, download: false }, layers: [],
  })))

  renderApp('/share/viewer')

  expect(await screen.findByRole('main', { name: 'Blender fallback' })).toBeVisible()
})

function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('unknown route falls back to the public dataset in development', async () => {
  server.use(
    http.get('/public-data/manifest.json', () =>
      HttpResponse.json({
        caseId: 'demo',
        unit: 'mm',
        coordinateSystem: 'LPS',
        layers: [],
      }),
    ),
  )

  renderApp('/')

  expect(await screen.findByRole('main', { name: 'Public CT · demo' })).toBeVisible()
})
