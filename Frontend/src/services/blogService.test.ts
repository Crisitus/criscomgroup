import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw-handlers'
import { BlogApiError, createBlogPost, listBlogPosts } from './blogService'

const BASE = 'http://localhost:3100/api'

describe('blogService', () => {
  it('listBlogPosts: devuelve items y total desde X-Total-Count', async () => {
    server.use(http.get(`${BASE}/blog/admin`, () => HttpResponse.json([{ id_post: 1 }], { headers: { 'X-Total-Count': '7' } })))
    const res = await listBlogPosts({ limit: 1 })
    expect(res.items).toHaveLength(1)
    expect(res.total).toBe(7)
  })
  it('createBlogPost: expone errores por campo', async () => {
    server.use(http.post(`${BASE}/blog/admin`, () => HttpResponse.json({ message: 'Revisa', errores: { titulo: 'Corto' } }, { status: 400 })))
    const error = await createBlogPost({ titulo: 'a' }).catch(e => e)
    expect(error).toBeInstanceOf(BlogApiError)
    expect(error.errores.titulo).toBe('Corto')
  })
})
