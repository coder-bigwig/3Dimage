import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import { App } from '../../app/App'
import { server } from '../../test/server'

function renderApp(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('shows the expired-link state for HTTP 410', async () => {
  server.use(
    http.get('http://localhost:8080/api/v1/shared-viewers/:token/manifest', () =>
      HttpResponse.json({ code: 'SHARE_EXPIRED', message: '分享链接已失效' }, { status: 410 }),
    ),
  )

  renderApp('/share/expired-token-000000000000000000000')

  expect(await screen.findByText('分享链接已失效')).toBeVisible()
})

test('renders the viewer shell after a valid manifest loads', async () => {
  server.use(
    http.get('http://localhost:8080/api/v1/shared-viewers/:token/manifest', () =>
      HttpResponse.json({
        resultId: '53ca6c71-bede-4b1a-89cf-f28a5fc0d22c',
        title: '肺部演示',
        unit: 'mm',
        coordinateSystem: 'LPS',
        manifestVersion: 1,
        permissions: { view: true, measure: true, annotate: true, savePlan: false, download: false },
        layers: [],
      }),
    ),
  )

  renderApp('/share/valid-token-00000000000000000000000')

  expect(await screen.findByRole('main', { name: '肺部演示' })).toBeVisible()
})
