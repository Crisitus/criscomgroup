'use strict';
/**
 * B3 / T3.1 — CORS whitelist desde FRONTEND_ORIGIN (S2)
 * Strict TDD: test creado ANTES del fix en app.js.
 * Estado inicial esperado: ROJO — cors() actual acepta cualquier origin,
 * por lo que el Test 1 fallará (el header sí estará presente).
 */
const request = require('supertest');
const { setupTestDb } = require('../helpers/db');
const { app } = require('../../src/app');

describe('CORS whitelist — S2', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  // Test 1: en NODE_ENV=production, origin no whitelisted NO debe recibir ACAO header
  it('en producción, origin no whitelisted no recibe Access-Control-Allow-Origin', async () => {
    const saved = guardarEnv(['NODE_ENV', 'FRONTEND_ORIGIN']);
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'http://frontend.example.com';

    try {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://malicious.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      restaurarEnv(saved);
    }
  });

  // Test 2: en NODE_ENV=production, origin que matchea FRONTEND_ORIGIN SÍ recibe el header
  it('en producción, origin whitelisted recibe Access-Control-Allow-Origin correcto', async () => {
    const saved = guardarEnv(['NODE_ENV', 'FRONTEND_ORIGIN']);
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'http://frontend.example.com';

    try {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://frontend.example.com');

      expect(res.headers['access-control-allow-origin']).toBe('http://frontend.example.com');
    } finally {
      restaurarEnv(saved);
    }
  });

  // Test 3 (regression): en NODE_ENV=test sin FRONTEND_ORIGIN, peticiones sin Origin
  // siguen funcionando (no rompe la suite existente)
  it('en entorno de test, peticiones sin Origin header funcionan normalmente (regression)', async () => {
    const saved = guardarEnv(['NODE_ENV', 'FRONTEND_ORIGIN']);
    // NODE_ENV=test, sin FRONTEND_ORIGIN — como en .env.test real
    delete process.env.FRONTEND_ORIGIN;

    try {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
    } finally {
      restaurarEnv(saved);
    }
  });
});

// --- Helpers de aislamiento de env (mismo patrón que boot.test.js) ---

function guardarEnv(keys) {
  return keys.reduce((acc, k) => ({ ...acc, [k]: process.env[k] }), {});
}

function restaurarEnv(saved) {
  Object.entries(saved).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
}
