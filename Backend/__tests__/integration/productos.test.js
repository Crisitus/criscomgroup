'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCategoria } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { productoConStock, productoSinStock } = require('../fixtures/productos.fixture');

// setupTestDb sincroniza todo el esquema: con la BD compartida puede pasar de los 15 s por defecto.
jest.setTimeout(90000);

describe('GET /api/productos', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    token = getAuthToken(gerenteUser);

    // Crear productos de prueba
    await createProducto(productoConStock);
    await createProducto(productoSinStock);
  });

  // TEST 3.1 — Sin token → 401
  it('devuelve 401 cuando no se envía token de autenticación', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.statusCode).toBe(401);
  });

  // TEST 3.2 — Con token de gerente → 200 y array de productos
  it('devuelve 200 y array de productos con token de gerente', async () => {
    const res = await request(app)
      .get('/api/productos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // TEST 3.3 — Producto con stock=0 sigue visible en el listado
  it('incluye productos con stock=0 en el listado (stock 0 es visible)', async () => {
    const res = await request(app)
      .get('/api/productos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    const sinStock = res.body.find(p => p.sku === productoSinStock.sku);
    expect(sinStock).toBeDefined();
    expect(sinStock.stock).toBe(0);
  });
});

// S8 — Validación precio/stock en POST /api/productos
describe('POST /api/productos — validación precio/stock (S8)', () => {
  let token;
  let id_categoria;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    token = getAuthToken(gerenteUser);
    const cat = await createCategoria();
    id_categoria = cat.id_categoria;
  });

  // T5.1-A: precio_unitario negativo → 400 (middleware lo captura — test de regresión)
  it('rechaza precio_unitario negativo con 400', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'SKU-S8-NEG-001',
        nombre: 'Producto precio negativo',
        precio_unitario: -10,
        precio_unitario_con_igv: 11.80,
        stock: 5,
        id_categoria,
      });
    expect(res.statusCode).toBe(400);
  });

  // T5.1-B: precio_unitario_con_igv negativo → 400 (controller debe validar — test ROJO)
  it('rechaza precio_unitario_con_igv negativo con 400', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'SKU-S8-NEG-002',
        nombre: 'Producto precio igv negativo',
        precio_unitario: 10.00,
        precio_unitario_con_igv: -5,
        stock: 5,
        id_categoria,
      });
    expect(res.statusCode).toBe(400);
  });

  // T5.1-C: stock negativo → 400 (controller debe validar — test ROJO)
  it('rechaza stock negativo con 400', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'SKU-S8-NEG-003',
        nombre: 'Producto stock negativo',
        precio_unitario: 10.00,
        precio_unitario_con_igv: 11.80,
        stock: -1,
        id_categoria,
      });
    expect(res.statusCode).toBe(400);
  });

  // T5.1-D: happy path precio > 0 y stock >= 0 → 201
  it('acepta producto válido con precio > 0 y stock >= 0 con 201', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'SKU-S8-VALID-001',
        nombre: 'Producto válido S8',
        precio_unitario: 100.00,
        precio_unitario_con_igv: 118.00,
        stock: 5,
        id_categoria,
      });
    expect(res.statusCode).toBe(201);
  });
});

// S8 — Validación precio/stock en PUT /api/productos/:id
describe('PUT /api/productos/:id — validación precio/stock (S8)', () => {
  let token;
  let productoId;

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    token = getAuthToken(gerenteUser);
    const producto = await createProducto({ sku: 'SKU-S8-PUT-BASE' });
    productoId = producto.id_producto;
  });

  // T5.1-E: precio_unitario = 0 en update → 400 (middleware permite 0, controller debe rechazar — ROJO)
  it('rechaza precio_unitario = 0 en update con 400', async () => {
    const res = await request(app)
      .put(`/api/productos/${productoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ precio_unitario: 0 });
    expect(res.statusCode).toBe(400);
  });

  // T5.1-F: stock = 0 en update → 200 (regla de negocio: stock 0 es válido — DA10)
  it('acepta stock = 0 en update con 200 (stock 0 es válido)', async () => {
    const res = await request(app)
      .put(`/api/productos/${productoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 0 });
    expect(res.statusCode).toBe(200);
  });
});
