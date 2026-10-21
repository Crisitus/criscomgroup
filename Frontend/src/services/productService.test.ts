import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw-handlers'
import { fetchProducts, fetchProductById } from './productService'

const BASE = 'http://localhost:3100/api'

// B7 — S11 (D3-A): el servicio debe propagar el 403 al caller
// en lugar de silenciarlo con [] o {}.
// El interceptor axios (api.ts:156-180) ya transforma el 403
// en ForbiddenError antes de llegar al catch del servicio.
describe('productService — propagación 403 (S11)', () => {
  it('fetchProducts: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/productos`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(fetchProducts()).rejects.toThrow()
  })

  it('fetchProductById: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/productos/:id`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(fetchProductById(1)).rejects.toThrow()
  })
})
