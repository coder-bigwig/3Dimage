import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { server } from '../../../test/server'
import { ViewerShell } from '../ViewerShell'
import type { Drawing } from './types'

const drawing: Drawing = { id: 'a', kind: 'line', points: [{ x: .1, y: .1 }, { x: .2, y: .2 }], text: '', color: '#ff0000' }
vi.mock('../ViewerCanvas', () => ({ ViewerCanvas: () => <div /> }))
vi.mock('./DrawingCanvas', () => ({ DrawingCanvas: ({ drawings, onAdd }: { drawings: Drawing[]; onAdd(d: Drawing): void }) => <div><output aria-label="当前图形">{drawings.map(d => d.id).join(',')}</output><button onClick={() => onAdd(drawing)}>测试绘制</button></div> }))
test('reload after a conflict discards undo snapshots from the older document', async () => {
  let loads = 0
  server.use(
    http.get('http://localhost:8080/api/v1/shared-viewers/:token/annotations', () => HttpResponse.json({ version: loads++, drawings: loads === 1 ? [] : [{ ...drawing, id: 'other-user' }], models: [] })),
    http.put('http://localhost:8080/api/v1/shared-viewers/:token/annotations', () => HttpResponse.json({ message: '版本冲突' }, { status: 409 })),
  )
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<ViewerShell shareToken="token" manifest={{ resultId: 'reload', title: '测试', coordinateSystem: 'RAS', unit: 'mm', manifestVersion: 1, layers: [], permissions: { view: true, annotate: true, measure: true, savePlan: true, download: false } }} />)
  fireEvent.click(screen.getByRole('button', { name: '标注' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '二维标注' }))
  await screen.findByText('标注已同步')
  fireEvent.click(screen.getByRole('button', { name: '测试绘制' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
  await waitFor(() => expect(screen.getByLabelText('当前图形')).toHaveTextContent('other-user'))
  fireEvent.click(screen.getByRole('button', { name: '撤销' }))
  expect(screen.getByLabelText('当前图形')).toHaveTextContent('other-user')
  confirm.mockRestore()
})
