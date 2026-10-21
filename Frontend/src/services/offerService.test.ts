import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw-handlers'
import { fetchOffers, createOrUpdateOffer, deleteOffersBulk, getApiErrorMessage } from './offerService'

const BASE = 'http://localhost:3100/api'

// B7 — S11 (D3-A): propagar 403 en lugar de retornar []
describe('offerService — propagación 403 (S11)', () => {
  it('fetchOffers: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/ofertas-del-dia`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(fetchOffers()).rejects.toThrow()
  })
})

describe('offerService - contrato real', () => {
  it('createOrUpdateOffer envia precio_fijo y devuelve el resultado por item', async () => {
    let body: any
    server.use(
      http.put(`${BASE}/ofertas-del-dia`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true, resultados: [{ id_producto: 1, estado: 'aplicada', motivo: null }], procesadas: [1], errores: [] })
      })
    )
    const r = await createOrUpdateOffer({ id_producto: 1, precio_fijo: 79.9 })
    expect(body).toEqual({ id_producto: 1, precio_fijo: 79.9 })
    expect(r.resultados[0].estado).toBe('aplicada')
  })

  it('createOrUpdateOffer devuelve el detalle cuando el backend responde 422', async () => {
    server.use(
      http.put(`${BASE}/ofertas-del-dia`, () =>
        HttpResponse.json({ success: false, resultados: [{ id_producto: 2, estado: 'error', motivo: 'precio_fijo invalido' }], procesadas: [], errores: [{ id_producto: 2, estado: 'error', motivo: 'precio_fijo invalido' }] }, { status: 422 })
      )
    )
    const r = await createOrUpdateOffer([{ id_producto: 2, precio_fijo: 999 }])
    expect(r.success).toBe(false)
    expect(r.errores[0].motivo).toBe('precio_fijo invalido')
  })

  it('deleteOffersBulk usa eliminar-lote y getApiErrorMessage lee response.data.message', async () => {
    server.use(
      http.post(`${BASE}/ofertas-del-dia/eliminar-lote`, () =>
        HttpResponse.json({ success: true, resultados: [{ id_producto: 3, estado: 'aplicada', motivo: null }], procesadas: [3], errores: [] })
      ),
      http.get(`${BASE}/ofertas-del-dia`, () => HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 }))
    )
    expect((await deleteOffersBulk([3])).procesadas).toEqual([3])
    try { await fetchOffers() } catch (e) { expect(getApiErrorMessage(e)).toBe('Acceso denegado') }
  })
})
