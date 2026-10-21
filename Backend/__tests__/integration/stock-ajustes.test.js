'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { MovimientoInventario } = require('../../src/models');

describe('Ajustes manuales de stock (seed-t4): atomicos y con kardex', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Cajero T4', email: 'cajero-t4@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  it('5 decrementos concurrentes de 1 sobre stock 2: solo 2 entran y quedan 2 movimientos', async () => {
    const p = await createProducto({ sku: 'SEED-T4-A', nombre: 'seed-t4 decremento', stock: 2 });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).patch(`/api/productos/${p.id_producto}/decrement`).set(auth).send({ cantidad: 1 }))
    );

    expect(responses.filter(r => r.status === 200).length).toBe(2);
    expect(responses.filter(r => r.status === 400).length).toBe(3);
    await p.reload();
    expect(Number(p.stock)).toBe(0);
    const movimientos = await MovimientoInventario.count({ where: { producto_id: p.id_producto, tipo: 'ajuste_salida' } });
    expect(movimientos).toBe(2);
  });

  it('PATCH /:id/stock fija stock absoluto y registra el movimiento con valores exactos', async () => {
    const p = await createProducto({ sku: 'SEED-T4-B', nombre: 'seed-t4 absoluto', stock: 4 });

    await request(app).patch(`/api/productos/${p.id_producto}/stock`).set(auth).send({ cantidad: 9 }).expect(200);
    await p.reload();
    expect(Number(p.stock)).toBe(9);
    const mov = await MovimientoInventario.findOne({ where: { producto_id: p.id_producto, tipo: 'ajuste_entrada' } });
    expect(Number(mov.stock_anterior)).toBe(4);
    expect(Number(mov.stock_nuevo)).toBe(9);
    expect(Number(mov.cantidad)).toBe(5);

    await request(app).patch(`/api/productos/${p.id_producto}/stock`).set(auth).send({ cantidad: 1 }).expect(200);
    await p.reload();
    expect(Number(p.stock)).toBe(1);
  });

  it('decremento sin stock suficiente responde 400 con el formato de siempre', async () => {
    const p = await createProducto({ sku: 'SEED-T4-C', nombre: 'seed-t4 corto', stock: 1 });

    const res = await request(app).patch(`/api/productos/${p.id_producto}/decrement`).set(auth).send({ cantidad: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/suficiente stock/);
    expect(Number(res.body.stockActual)).toBe(1);
    await p.reload();
    expect(Number(p.stock)).toBe(1);
  });

  it('PUT /:id con stock fija el absoluto bajo lock y registra edicion_producto', async () => {
    const p = await createProducto({ sku: 'SEED-T4-D', nombre: 'seed-t4 edicion', stock: 3 });

    await request(app).put(`/api/productos/${p.id_producto}`).set(auth).send({ stock: 10 }).expect(200);
    await p.reload();
    expect(Number(p.stock)).toBe(10);
    const mov = await MovimientoInventario.findOne({ where: { producto_id: p.id_producto, referencia_tipo: 'edicion_producto' } });
    expect(mov).not.toBeNull();
    expect(Number(mov.stock_anterior)).toBe(3);
    expect(Number(mov.stock_nuevo)).toBe(10);
  });
});
