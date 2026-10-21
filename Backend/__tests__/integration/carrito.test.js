'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');

describe('Carrito persistente del marketplace', () => {
  let token;
  let product;

  beforeAll(async () => {
    await setupTestDb();
    const user = await createUser({ ...gerente, email: 'carrito@test.local' });
    token = getAuthToken(user);
    product = await createProducto({ sku: 'CART-001', nombre: 'Producto carrito', stock: 20 });
  });

  it('exige autenticación', async () => {
    expect((await request(app).get('/api/carrito')).statusCode).toBe(401);
  });

  it('agrega, acumula, actualiza y elimina productos', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post('/api/carrito/items').set(auth).send({ id_producto: product.id_producto, cantidad: 2 })).statusCode).toBe(201);
    await request(app).post('/api/carrito/items').set(auth).send({ id_producto: product.id_producto, cantidad: 1 }).expect(201);
    let response = await request(app).get('/api/carrito').set(auth).expect(200);
    expect(response.body.items[0].cantidad).toBe(3);
    expect(response.body.items[0].producto.id_producto).toBe(product.id_producto);
    await request(app).put(`/api/carrito/items/${product.id_producto}`).set(auth).send({ cantidad: 5 }).expect(200);
    response = await request(app).get('/api/carrito').set(auth).expect(200);
    expect(response.body.items[0].cantidad).toBe(5);
    await request(app).delete(`/api/carrito/items/${product.id_producto}`).set(auth).expect(200);
    response = await request(app).get('/api/carrito').set(auth).expect(200);
    expect(response.body.items).toHaveLength(0);
  });

  it('fusiona el carrito del visitante al autenticarse', async () => {
    const response = await request(app).post('/api/carrito/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id_producto, quantity: 2 }] })
      .expect(200);
    expect(response.body.items[0].cantidad).toBe(2);
  });

  it('rechaza productos inexistentes y cantidades inválidas', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/carrito/items').set(auth).send({ id_producto: 999999, cantidad: 1 }).expect(400);
    await request(app).post('/api/carrito/items').set(auth).send({ id_producto: product.id_producto, cantidad: 0 }).expect(400);
  });
});
