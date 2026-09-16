import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect, test } from 'vitest'
import { server } from '../../../test/server'
import { useAnnotations } from './useAnnotations'
import type { AnnotationDocument } from './types'

const endpoint = 'http://localhost:8080/api/v1/shared-viewers/:token/annotations'
const one = { drawings: [], models: [{ id: 'a', layerId: 'layer', text: '第一次', position: [1, 2, 3] as [number, number, number], offset: [55, -45] as [number, number] }] }
test('edits made during a save are serialized with the new server version', async () => {
  let release!: () => void
  const waiting = new Promise<void>(resolve => { release = resolve })
  const requests: AnnotationDocument[] = []
  server.use(http.put(endpoint, async ({ request }) => {
    const value = await request.json() as AnnotationDocument
    requests.push(value)
    if (requests.length === 1) await waiting
    return HttpResponse.json({ ...value, version: value.version + 1 })
  }))
  const { result } = renderHook(() => useAnnotations('result', 'token'))
  await waitFor(() => expect(result.current.ready).toBe(true))
  act(() => result.current.change(one))
  await waitFor(() => expect(requests).toHaveLength(1))
  act(() => result.current.change({ ...one, models: [{ ...one.models[0], text: '第二次' }] }))
  await act(async () => release())
  await waitFor(() => expect(result.current.status).toBe('标注已保存'))
  expect(requests.map(value => value.version)).toEqual([0, 1])
  expect(requests[1].models[0].text).toBe('第二次')
})
test('conflicts retain unsaved edits and never claim success', async () => {
  server.use(http.put(endpoint, () => HttpResponse.json({ message: '版本冲突' }, { status: 409 })))
  const { result } = renderHook(() => useAnnotations('result', 'token'))
  await waitFor(() => expect(result.current.ready).toBe(true))
  act(() => result.current.change(one))
  await waitFor(() => expect(result.current.error).toBe(true))
  expect(result.current.status).toContain('未保存')
  expect(result.current.content).toEqual(one)
})
test('a failed initial load cannot overwrite unknown server annotations', async () => {
  server.use(http.get(endpoint, () => HttpResponse.json({ message: '暂时不可用' }, { status: 503 })))
  const { result } = renderHook(() => useAnnotations('result', 'token'))
  await waitFor(() => expect(result.current.error).toBe(true))
  act(() => result.current.change(one))
  expect(result.current.ready).toBe(false)
  expect(result.current.content.models).toEqual([])
})
