'use strict';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { User } = require('../../src/models');

describe('POST /api/auth/login', () => {
  let gerenteUser;

  beforeAll(async () => {
    await setupTestDb();
    gerenteUser = await createUser(gerente);
  });

  // TEST 1 — Happy path: credenciales correctas → 200 con token
  it('devuelve 200 y token JWT para credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: gerente.email, password: gerente.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      email: gerente.email,
      id_role: gerente.id_role,
    });
  });

  // TEST 2.1 — Respuesta genérica para no permitir enumerar correos
  it('devuelve 401 genérico para password incorrecto', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: gerente.email, password: 'password_incorrecto' });

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe('Credenciales incorrectas');
    expect(res.body.token).toBeUndefined();
  });

  // TEST 2.2 — Debe ser indistinguible de una contraseña incorrecta
  it('devuelve la misma respuesta para email no registrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.local', password: 'cualquier_pass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe('Credenciales incorrectas');
    expect(res.body.token).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// S5 + S7 — Register: hash de password y JWT con exp
// ---------------------------------------------------------------------------
describe('POST /api/auth/register — S5/S7', () => {
  let gerenteToken;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente); // necesario para login en S7
    gerenteToken = getAuthToken(gerenteUser);      // necesario para register en S5
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TEST S5 — El password que llega a User.create debe ser un hash bcrypt, NO texto plano
  it('hashea el password ANTES de persistir en DB — S5', async () => {
    // Spy puro: llama a la implementación original pero registra los argumentos
    const createSpy = jest.spyOn(User, 'create');

    const email = `test-s5-${Date.now()}@test.local`;
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${gerenteToken}`)
      .send({ email, password: 'Secret123!', name: 'Test S5' });

    expect(res.statusCode).toBe(200);
    // El password capturado en la llamada a User.create debe ser hash bcrypt (empieza con $2)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        password: expect.stringMatching(/^\$2/),
      })
    );
  });

  // TEST S7 — El token JWT debe incluir claim exp aunque JWT_EXPIRES_IN no esté definido
  it('el token incluye claim exp aunque JWT_EXPIRES_IN no esté definido — S7', async () => {
    const originalExpiry = process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_EXPIRES_IN;

    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: gerente.email, password: gerente.password });

      expect(res.statusCode).toBe(200);
      const decoded = jwt.decode(res.body.token);
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
    } finally {
      if (originalExpiry !== undefined) process.env.JWT_EXPIRES_IN = originalExpiry;
    }
  });
});

describe('POST /api/auth/register-customer', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  it('crea una cuenta publica solo con rol 4 y devuelve una sesion', async () => {
    const email = `cliente-${Date.now()}@test.local`;
    const res = await request(app)
      .post('/api/auth/register-customer')
      .send({
        name: 'Cliente Web',
        email,
        password: 'Secret123!',
        id_role: 1,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email, id_role: 4 });

    const persisted = await User.findOne({ where: { email } });
    expect(persisted.id_role).toBe(4);
    expect(persisted.password).toMatch(/^\$2/);
  });
});
