import { expect, test } from 'vitest'
import { createViewerStore } from './viewer.store'

test('activates only one exclusive viewer tool', () => {
  const store = createViewerStore()
  store.getState().activateTool('length')
  store.getState().activateTool('clipPlane')

  expect(store.getState().mode).toBe('clip')
  expect(store.getState().activeTool).toBe('clipPlane')
})

test('closing a mode returns to browse and clears incomplete work', () => {
  const store = createViewerStore()
  store.getState().activateTool('annotation')
  store.getState().setPendingPoints(2)
  store.getState().closeToolMode()

  expect(store.getState().mode).toBe('browse')
  expect(store.getState().activeTool).toBeNull()
  expect(store.getState().pendingPoints).toBe(0)
})
