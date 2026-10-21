'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createEmpresa } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');

// ============================================================
// B6 — V2: GET /api/companies/for-sales empty state
// ============================================================

describe('GET /api/companies/for-sales — DB vacía (V2)', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    token = getAuthToken(gerenteUser);
    // Sin empresa creada — estado de onboarding vacío
  });

  // Regression auth: sin token → 401
  it('devuelve 401 cuando no se envía token de autenticación', async () => {
    const res = await request(app).get('/api/companies/for-sales');
    expect(res.statusCode).toBe(401);
  });

  // V2 principal: DB vacía → 200 con data null (NO 404)
  it('devuelve 200 con data null cuando no hay empresa configurada (V2)', async () => {
    const res = await request(app)
      .get('/api/companies/for-sales')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.data).toBeNull();
  });
});

describe('GET /api/companies/for-sales — con empresa existente', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    token = getAuthToken(gerenteUser);
    await createEmpresa(gerenteUser.id_user);
  });

  // Happy path: empresa creada → 200 con datos
  it('devuelve 200 con datos de empresa cuando hay una configurada', async () => {
    const res = await request(app)
      .get('/api/companies/for-sales')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.ruc).toBe('20000000001');
    expect(res.body.data.razon_social).toBe('Empresa Test S.A.C.');
  });
});
