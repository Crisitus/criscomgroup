'use strict';
/**
 * B4 / T4.1 — Uploads split público/privado (S3, D1=A)
 * Strict TDD: test creado ANTES del fix en app.js.
 * Estado inicial esperado: ROJO — /uploads/* hoy es público sin auth,
 * por lo que el Test 1 fallará (recibirá 404 en lugar de 401).
 */
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');

describe('Uploads split público/privado — S3 (D1=A)', () => {
  let adminToken;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    adminToken = getAuthToken(gerenteUser);
  });

  // Test 1: GET /uploads/private/<archivo> SIN token → 401
  it('GET /uploads/private/test.txt sin token devuelve 401', async () => {
    const res = await request(app)
      .get('/uploads/private/test.txt');

    expect(res.statusCode).toBe(401);
  });

  // Test 2: GET /uploads/private/<archivo> CON token válido → NOT 401 (200 o 404)
  it('GET /uploads/private/test.txt con token válido no devuelve 401', async () => {
    const res = await request(app)
      .get('/uploads/private/test.txt')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).not.toBe(401);
  });

  // Test 3 (D1=A): GET /uploads/public/<archivo> SIN token → 200 o 404 (sin auth)
  it('GET /uploads/public/test.txt sin token no devuelve 401 (es público)', async () => {
    const res = await request(app)
      .get('/uploads/public/test.txt');

    expect(res.statusCode).not.toBe(401);
  });
});
