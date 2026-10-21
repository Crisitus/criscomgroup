import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw-handlers'
import { fetchSales, fetchSaleById } from './saleService'

const BASE = 'http://localhost:3100/api'

// B7 — S11 (D3-A): propagar 403 en lugar de retornar [] / {}
describe('saleService — propagación 403 (S11)', () => {
  it('fetchSales: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/ventas`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(fetchSales()).rejects.toThrow()
  })

  it('fetchSaleById: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/ventas/:id`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(fetchSaleById(1)).rejects.toThrow()
  })
})
