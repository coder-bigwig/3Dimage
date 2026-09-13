import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicDatasetPage } from './PublicDatasetPage'
import { getPublicDatasetManifest } from '../../api/publicDataset'

vi.mock('../../api/publicDataset', () => ({ getPublicDatasetManifest: vi.fn() }))
vi.mock('../../features/viewer/ViewerShell', () => ({ ViewerShell: ({ manifest }: { manifest: { title: string } }) => <div>{manifest.title}</div> }))

describe('PublicDatasetPage', () => {
  beforeEach(() => vi.mocked(getPublicDatasetManifest).mockReset())

  it('loads an explicitly selected model in the same viewer shell', async () => {
    vi.mocked(getPublicDatasetManifest).mockResolvedValue({ title: 'Blender lung' } as never)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><PublicDatasetPage manifestUrl="/public-data/blender-trial/manifest.json" /></QueryClientProvider>)
    expect(await screen.findByText('Blender lung')).toBeInTheDocument()
    expect(getPublicDatasetManifest).toHaveBeenCalledWith('/public-data/blender-trial/manifest.json', expect.any(AbortSignal))
  })

  it('renders the public dataset in the existing viewer shell', async () => {
    vi.mocked(getPublicDatasetManifest).mockResolvedValue({ title: 'Public CT · lung_001' } as never)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><PublicDatasetPage /></QueryClientProvider>)
    expect(await screen.findByText('Public CT · lung_001')).toBeInTheDocument()
  })
})
