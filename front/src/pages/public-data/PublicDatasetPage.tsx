import { useQuery } from '@tanstack/react-query'
import { getPublicDatasetManifest } from '../../api/publicDataset'
import { ViewerShell } from '../../features/viewer/ViewerShell'

const defaultManifestUrl = import.meta.env.VITE_PUBLIC_DATA_MANIFEST_URL ?? '/public-data/manifest.json'

export function PublicDatasetPage({ manifestUrl = defaultManifestUrl }: { manifestUrl?: string } = {}) {
  const manifestQuery = useQuery({
    queryKey: ['public-dataset-manifest', manifestUrl],
    queryFn: ({ signal }) => getPublicDatasetManifest(manifestUrl, signal),
    retry: false,
  })
  if (manifestQuery.isPending) return <main className="share-state"><div className="share-state__card"><h1>正在加载公开 CT 数据</h1></div></main>
  if (manifestQuery.isError) return <main className="share-state"><div className="share-state__card"><h1>公开数据尚未生成</h1><p>请先运行 MSD Lung 导入与模型转换流程。</p></div></main>
  return <ViewerShell key={manifestQuery.data.resultId} manifest={manifestQuery.data} />
}
