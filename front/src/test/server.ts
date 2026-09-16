import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(http.get('http://localhost:8080/api/v1/shared-viewers/:token/annotations', () => HttpResponse.json({ version: 0, drawings: [], models: [] })))
