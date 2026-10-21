'use strict';
/**
 * ecommerce-integration hot-patch — Stubs para endpoints que el Ecommerce (Next.js)
 * invoca pero que aún no tienen implementación real en el ERP.
 *
 * Contexto: el Ecommerce heredado tiene servicios que llaman a /testimonials, /contacts,
 * /featured-category, /solicitudes-importacion/*, /claims. En vez de dejar que tiren
 * 404 y rompan la UI, exponemos stubs 200 con payload vacío. Cuando se implemente
 * cada módulo real (ciclo ecommerce-features), estos stubs se reemplazan.
 */
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');

describe('Ecommerce stubs — endpoints vacíos pero válidos (hot-patch)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  it('GET /api/ecommerce/testimonials devuelve 200 + array vacío', async () => {
    const res = await request(app).get('/api/ecommerce/testimonials');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  it('GET /api/ecommerce/contacts devuelve 200 + array vacío', async () => {
    const res = await request(app).get('/api/ecommerce/contacts');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/ecommerce/estadisticas-publicas devuelve métricas agregadas sin datos personales', async () => {
    const res = await request(app).get('/api/ecommerce/estadisticas-publicas');
    expect(res.statusCode).toBe(200);
    expect(Number.isInteger(res.body.productos_disponibles)).toBe(true);
    expect(Number.isInteger(res.body.clientes_atendidos)).toBe(true);
    expect(res.body.actualizado_en).toBeTruthy();
    expect(res.body.clientes).toBeUndefined();
  });

  it('GET /api/ecommerce/featured-category devuelve 200 + null (no hay destacada aún)', async () => {
    const res = await request(app).get('/api/ecommerce/featured-category');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });

  it('GET /api/ecommerce/solicitudes-importacion devuelve 200 + array vacío', async () => {
    const res = await request(app).get('/api/ecommerce/solicitudes-importacion');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/ecommerce/solicitudes-importacion/mis-solicitudes es alias del handler real: 401 sin token', async () => {
    // ecom-logica T3: el stub vacío fue reemplazado por el endpoint real con auth.
    const res = await request(app).get('/api/ecommerce/solicitudes-importacion/mis-solicitudes');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/ecommerce/solicitudes-importacion/admin devuelve 200 + array vacío', async () => {
    const res = await request(app).get('/api/ecommerce/solicitudes-importacion/admin');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/ecommerce/solicitudes-importacion/admin/estadisticas devuelve 200 + objeto', async () => {
    const res = await request(app).get('/api/ecommerce/solicitudes-importacion/admin/estadisticas');
    expect(res.statusCode).toBe(200);
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
  });

  it('GET /api/ecommerce/claims devuelve 200 + array vacío (alias informativo)', async () => {
    const res = await request(app).get('/api/ecommerce/claims');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
