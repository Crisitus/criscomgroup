import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw-handlers'
import { fetchCategories } from './categoryService'

const BASE = 'http://localhost:3100/api'

// B7 — S11 (D3-A): propagar 403 en lugar de retornar []
describe('categoryService — propagación 403 (S11)', () => {
  it('fetchCategories: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/categorias`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(fetchCategories()).rejects.toThrow()
  })
})
