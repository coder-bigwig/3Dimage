import { expect, test } from 'vitest'
import { SceneStateSerializer, type SceneState } from './SceneStateSerializer'

test('round-trips durable viewer state and excludes secrets', () => {
  const state: SceneState & Record<string, unknown> = {
    schemaVersion: 1,
    background: '#d9d9d9',
    camera: { position: [0, 0, 100], target: [0, 0, 0] },
    layers: [{ id: 'lung', visible: true, opacity: 0.7, color: '#ef476f', matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }],
    exploded: false,
    clippingPlanes: [],
    measurements: [],
    annotations: [],
    signedUrl: 'https://secret.example/signed',
    accessToken: 'secret',
  }
  const serializer = new SceneStateSerializer()

  const json = serializer.serialize(state)
  const restored = serializer.deserialize(json)

  expect(json).not.toContain('secret.example')
  expect(json).not.toContain('accessToken')
  expect(restored.layers[0].id).toBe('lung')
})
