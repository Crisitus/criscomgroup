'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { DetalleVenta, MovimientoInventario } = require('../../src/models');

describe('POS concurrencia (seed-t1): la ultima unidad solo se vende una vez', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Cajero T1', email: 'cajero-t1@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  const payload = (codigo, cantidad) => ({
    id_cajero: cajero.id_user,
    metodo_pago: 'efectivo',
    items: [{ codigo_barras: codigo, cantidad }],
  });

  const contarLineas = async (productoId) => ({
    detalles: await DetalleVenta.count({ where: { producto_id: productoId } }),
    movimientos: await MovimientoInventario.count({ where: { producto_id: productoId, tipo: 'venta' } }),
  });

  it('5 ventas concurrentes por la ultima unidad: gana exactamente una', async () => {
    const p = await createProducto({ sku: 'SEED-T1-A', nombre: 'seed-t1 ultima unidad', stock: 1 });
    await createCodigoBarras(p.id_producto, 'SEED-T1-BC-A', 1);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/api/ventas').set(auth).send(payload('SEED-T1-BC-A', 1)))
    );

    expect(responses.filter(r => r.status === 201).length).toBe(1);
    expect(responses.filter(r => r.status === 400).length).toBe(4);

    await p.reload();
    expect(Number(p.stock)).toBe(0);
    const { detalles, movimientos } = await contarLineas(p.id_producto);
    expect(detalles).toBe(1);
    expect(movimientos).toBe(1);
  });

  it('stock 5 y dos ventas concurrentes de 3: solo una entra y el stock queda en 2', async () => {
    const p = await createProducto({ sku: 'SEED-T1-B', nombre: 'seed-t1 sobreventa parcial', stock: 5 });
    await createCodigoBarras(p.id_producto, 'SEED-T1-BC-B', 5);

    const responses = await Promise.all([
      request(app).post('/api/ventas').set(auth).send(payload('SEED-T1-BC-B', 3)),
      request(app).post('/api/ventas').set(auth).send(payload('SEED-T1-BC-B', 3)),
    ]);

    expect(responses.filter(r => r.status === 201).length).toBe(1);
    expect(responses.filter(r => r.status === 400).length).toBe(1);

    await p.reload();
    expect(Number(p.stock)).toBe(2);
    const { detalles, movimientos } = await contarLineas(p.id_producto);
    expect(detalles).toBe(1);
    expect(movimientos).toBe(1);
  });

  it('rafagas repetidas nunca venden mas que el stock ni lo dejan negativo', async () => {
    const p = await createProducto({ sku: 'SEED-T1-C', nombre: 'seed-t1 rafaga', stock: 2 });
    await createCodigoBarras(p.id_producto, 'SEED-T1-BC-C', 2);

    for (let i = 0; i < 4; i++) {
      await Promise.all([
        request(app).post('/api/ventas').set(auth).send(payload('SEED-T1-BC-C', 1)),
        request(app).post('/api/ventas').set(auth).send(payload('SEED-T1-BC-C', 1)),
      ]);
    }

    await p.reload();
    expect(Number(p.stock)).toBe(0);
    const { detalles } = await contarLineas(p.id_producto);
    expect(detalles).toBe(2);
  });
});
