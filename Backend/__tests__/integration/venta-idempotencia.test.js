'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { Venta, MovimientoInventario } = require('../../src/models');

describe('Idempotencia del POS (seed-m5): un reintento no duplica la venta', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Cajero M5', email: 'cajero-m5@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  it('misma clave dos veces: una sola venta, stock descontado una vez', async () => {
    const p = await createProducto({ sku: 'SEED-M5-A', nombre: 'seed-m5 idempotente', stock: 5 });
    await createCodigoBarras(p.id_producto, 'SEED-M5-BC-A', 5);
    const payload = {
      id_cajero: cajero.id_user,
      metodo_pago: 'efectivo',
      items: [{ codigo_barras: 'SEED-M5-BC-A', cantidad: 2 }],
      idempotency_key: 'seed-m5-clave-unica',
    };

    const primera = await request(app).post('/api/ventas').set(auth).send(payload);
    expect(primera.status).toBe(201);
    const segunda = await request(app).post('/api/ventas').set(auth).send(payload);
    expect(segunda.status).toBe(200);
    expect(segunda.body.duplicada).toBe(true);
    expect(segunda.body.venta.venta_id).toBe(primera.body.venta.venta_id);

    expect(await Venta.unscoped().count({ where: { idempotency_key: 'seed-m5-clave-unica' } })).toBe(1);
    await p.reload();
    expect(Number(p.stock)).toBe(3);
    expect(await MovimientoInventario.count({ where: { producto_id: p.id_producto, tipo: 'venta' } })).toBe(1);
  });

  it('tambien funciona por cabecera Idempotency-Key y dos claves distintas crean dos ventas', async () => {
    const p = await createProducto({ sku: 'SEED-M5-B', nombre: 'seed-m5 cabecera', stock: 5 });
    await createCodigoBarras(p.id_producto, 'SEED-M5-BC-B', 5);
    const payload = { id_cajero: cajero.id_user, metodo_pago: 'efectivo', items: [{ codigo_barras: 'SEED-M5-BC-B', cantidad: 1 }] };

    const primera = await request(app).post('/api/ventas').set(auth).set('Idempotency-Key', 'seed-m5-header').send(payload);
    expect(primera.status).toBe(201);
    const reintento = await request(app).post('/api/ventas').set(auth).set('Idempotency-Key', 'seed-m5-header').send(payload);
    expect(reintento.status).toBe(200);
    expect(reintento.body.duplicada).toBe(true);

    const otra = await request(app).post('/api/ventas').set(auth).set('Idempotency-Key', 'seed-m5-header-2').send(payload);
    expect(otra.status).toBe(201);
    expect(otra.body.venta.venta_id).not.toBe(primera.body.venta.venta_id);

    await p.reload();
    expect(Number(p.stock)).toBe(3);
  });
});
