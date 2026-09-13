import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from './App'
import { server } from '../test/server'

afterEach(() => vi.unstubAllEnvs())

test('local Blender entry uses the existing viewer shell and selected manifest', async () => {
  vi.stubEnv('VITE_ENABLE_BLENDER_DEMO', 'true')
  server.use(http.get('/public-data/blender-trial/manifest.json', () => HttpResponse.json({
    caseId: 'blender-v2', title: 'Blender integrated', renderStyle: 'clinical', unit: 'mm', coordinateSystem: 'RAS', layers: [],
  })))
  renderApp('/share/viewer')
  expect(await screen.findByRole('main', { name: 'Blender integrated' })).toBeVisible()
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
