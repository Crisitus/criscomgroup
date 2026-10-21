'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createEmpresa } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { BlogPost } = require('../../src/models');

const CONTENT = 'Contenido de prueba suficientemente largo para pasar la validacion del articulo del blog de Criscom.';
const base = (over = {}) => ({ titulo: 'Guia de mantenimiento de laptops', resumen: 'Resumen util para clientes y buscadores del blog.', contenido: CONTENT, ...over });

describe('Blog y contenidos - logica', () => {
  let token;
  const auth = req => req.set('Authorization', `Bearer ${token}`);
  const post = (body) => auth(request(app).post('/api/blog/admin')).send(body);

  beforeAll(async () => {
    await setupTestDb();
    const user = await createUser(gerente);
    await createEmpresa(user.id_user);
    token = getAuthToken(user);
  });

  it('crea, lee completo y las listas excluyen contenido', async () => {
    const res = await post(base({ estado: 'publicado' }));
    expect(res.statusCode).toBe(201);
    expect(res.body.slug).toBe('guia-de-mantenimiento-de-laptops');
    expect(res.body.publicado_en).toMatch(/-05:00$/);
    const id = res.body.id_post;
    const one = await auth(request(app).get(`/api/blog/admin/${id}`));
    expect(one.body.contenido).toBe(CONTENT);
    const list = await auth(request(app).get('/api/blog/admin?limit=10'));
    expect(list.headers['x-total-count']).toBe('1');
    expect(list.body[0]).not.toHaveProperty('contenido');
    const pub = await request(app).get('/api/blog/public');
    expect(Array.isArray(pub.body)).toBe(true);
    expect(pub.body[0]).not.toHaveProperty('contenido');
    ['id_post', 'slug', 'titulo', 'resumen', 'imagen_url', 'categoria', 'publicado_en'].forEach(k => expect(pub.body[0]).toHaveProperty(k));
    const detail = await request(app).get('/api/blog/public/guia-de-mantenimiento-de-laptops');
    expect(detail.statusCode).toBe(200);
    ['contenido', 'palabras_clave', 'actualizado_en'].forEach(k => expect(detail.body).toHaveProperty(k));
    expect(detail.body).not.toHaveProperty('autor_id');
  });

  it('devuelve errores por campo sin truncar', async () => {
    const res = await post({ titulo: 'abc', resumen: 'corto', contenido: 'x', imagen_url: 'ftp://x', categoria: 'a' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBeTruthy();
    ['titulo', 'resumen', 'contenido', 'imagen_url'].forEach(k => expect(res.body.errores).toHaveProperty(k));
    const long = await post(base({ resumen: 'a'.repeat(330) }));
    expect(long.statusCode).toBe(400);
    expect(long.body.errores.resumen).toMatch(/320/);
    const noSlug = await post(base({ titulo: '\u4f60\u597d\u4e16\u754c\u4f60\u597d' }));
    expect(noSlug.statusCode).toBe(400);
    expect(noSlug.body.errores).toHaveProperty('slug');
  });

  it('agrega sufijo -2 en colision de slug', async () => {
    const res = await post(base());
    expect(res.statusCode).toBe(201);
    expect(res.body.slug).toBe('guia-de-mantenimiento-de-laptops-2');
    expect(res.body.aviso_slug).toMatch(/ya exist/);
  });

  it('publicar/despublicar conserva fecha y el slug publicado no cambia sin bandera', async () => {
    const c = await post(base({ titulo: 'Otro articulo sobre redes', estado: 'publicado' }));
    const id = c.body.id_post; const fecha = c.body.publicado_en;
    const draft = await auth(request(app).put(`/api/blog/admin/${id}`)).send({ estado: 'borrador' });
    expect(draft.body.estado).toBe('borrador');
    expect(draft.body.publicado_en).toBe(fecha);
    expect((await request(app).get('/api/blog/public/otro-articulo-sobre-redes')).statusCode).toBe(404);
    const again = await auth(request(app).put(`/api/blog/admin/${id}`)).send({ estado: 'publicado' });
    expect(again.body.publicado_en).toBe(fecha);
    const kept = await auth(request(app).put(`/api/blog/admin/${id}`)).send({ slug: 'nuevo-slug' });
    expect(kept.body.slug).toBe('otro-articulo-sobre-redes');
    expect(kept.body.aviso_slug).toBeTruthy();
    const changed = await auth(request(app).put(`/api/blog/admin/${id}`)).send({ slug: 'nuevo-slug', cambiar_slug: true });
    expect(changed.body.slug).toBe('nuevo-slug');
  });

  it('programa: una publicacion futura no aparece en /public', async () => {
    const future = new Date(Date.now() + 7 * 86400000).toISOString();
    const c = await post(base({ titulo: 'Articulo programado futuro', estado: 'publicado', publicado_en: future }));
    expect(c.statusCode).toBe(201);
    const pub = await request(app).get('/api/blog/public');
    expect(pub.body.some(p => p.slug === 'articulo-programado-futuro')).toBe(false);
    expect((await request(app).get('/api/blog/public/articulo-programado-futuro')).statusCode).toBe(404);
    const bad = await post(base({ titulo: 'Fecha mala articulo', publicado_en: 'no-es-fecha' }));
    expect(bad.body.errores).toHaveProperty('publicado_en');
  });

  it('normaliza categorias y las lista sin duplicados', async () => {
    await post(base({ titulo: 'Cat uno articulo', categoria: 'Tecnologia' }));
    await post(base({ titulo: 'Cat dos articulo', categoria: 'TECNOLOG\u00cdA' }));
    const cats = await auth(request(app).get('/api/blog/admin/categorias'));
    const tech = cats.body.filter(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'tecnologia');
    expect(tech).toHaveLength(1);
    const filtered = await auth(request(app).get('/api/blog/admin?categoria=tecnologia'));
    expect(filtered.body.length).toBeGreaterThanOrEqual(2);
  });

  it('elimina y responde 500 JSON si la base falla', async () => {
    const c = await post(base({ titulo: 'Articulo para eliminar' }));
    expect((await auth(request(app).delete(`/api/blog/admin/${c.body.id_post}`))).statusCode).toBe(200);
    expect((await auth(request(app).get(`/api/blog/admin/${c.body.id_post}`))).statusCode).toBe(404);
    const spy = jest.spyOn(BlogPost, 'findAll').mockRejectedValueOnce(new Error('db caida'));
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/api/blog/public');
    spy.mockRestore(); err.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBeTruthy();
  });
});
