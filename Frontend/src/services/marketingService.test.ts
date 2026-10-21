import { describe, it, expect, vi } from 'vitest'
import api from '../lib/api'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw-handlers'
import {
  getTarjetas,
  getTarjetaById,
  getBanners,
  getBannerById,
  createBannerCarrusel,
  getApiErrorMessage,
} from './marketingService'

const BASE = 'http://localhost:3100/api'

// B7 — S11 (D3-A): propagar 403 en lugar de retornar [] / {}
describe('marketingService — propagación 403 (S11)', () => {
  it('getTarjetas: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/marketing/tarjetas`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(getTarjetas()).rejects.toThrow()
  })

  it('getTarjetaById: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/marketing/tarjetas/:id`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(getTarjetaById(1)).rejects.toThrow()
  })

  it('getBanners: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/marketing/banners`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(getBanners()).rejects.toThrow()
  })

  it('getBannerById: rechaza con error cuando la API devuelve 403', async () => {
    server.use(
      http.get(`${BASE}/marketing/banners/:id`, () =>
        HttpResponse.json({ message: 'Acceso denegado' }, { status: 403 })
      )
    )
    await expect(getBannerById(1)).rejects.toThrow()
  })
})

describe('marketingService - banners', () => {
  it('createBannerCarrusel envia titulo, orden y activo', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { banner: { id_banner: 1 } } })
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    await createBannerCarrusel({ imagen: file, titulo: 'Hola', orden: 4, activo: false })
    const form = post.mock.calls[0][1] as FormData
    expect(form.get('titulo')).toBe('Hola')
    expect(form.get('orden')).toBe('4')
    expect(form.get('activo')).toBe('false')
    expect(form.get('imagen_banner')).toBeInstanceOf(File)
    post.mockRestore()
  })

  it('createBannerCarrusel muestra el mensaje del backend', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue({ response: { status: 400, data: { message: 'Formato no permitido' } } })
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    await expect(createBannerCarrusel({ imagen: file })).rejects.toThrow('Formato no permitido')
    post.mockRestore()
  })

  it('getApiErrorMessage prioriza message, luego error y luego el respaldo', () => {
    expect(getApiErrorMessage({ response: { data: { error: 'E' } } }, 'F')).toBe('E')
    expect(getApiErrorMessage({}, 'F')).toBe('F')
  })
})
