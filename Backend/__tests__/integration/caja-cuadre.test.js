'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');

describe('Cierre de caja (seed-m1): el servidor cuadra contra las ventas reales', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Cajero M1', email: 'cajero-m1@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  it('ignora los totales declarados por el cliente y guarda los calculados desde Venta', async () => {
    const p = await createProducto({ sku: 'SEED-M1-A', nombre: 'seed-m1 cuadre', stock: 10 });
    await createCodigoBarras(p.id_producto, 'SEED-M1-BC-A', 10);

    const vender = (metodo_pago) => request(app).post('/api/ventas').set(auth).send({
      id_cajero: cajero.id_user,
      metodo_pago,
      items: [{ codigo_barras: 'SEED-M1-BC-A', cantidad: 1 }],
    }).expect(201);
    await vender('efectivo');
    await vender('efectivo');
    await vender('transferencia');

    // El cajero declara totales inflados: el backend debe ignorarlos
    const res = await request(app).post('/api/cierre-caja').set(auth).send({
      fecha_apertura: '2020-01-01T00:00:00',
      fecha_cierre: new Date(Date.now() + 60000).toISOString(),
      cajero_id: cajero.id_user,
      saldo_efectivo: 23.60,
      total_efectivo: 9999,
      total_tarjeta: 8888,
      total_transferencia: 7777,
      total_yape: 6666,
      total_plin: 5555,
      cantidad_ventas: 999,
      estado: 'cerrado',
      observaciones: 'seed-m1 cuadre',
    });

    expect(res.status).toBe(201);
    const cierre = res.body.cierre;
    // 3 ventas de 11.80 c/u (precio del helper: 10 + IGV)
    expect(Number(cierre.total_efectivo)).toBeCloseTo(23.6, 2);
    expect(Number(cierre.total_transferencia)).toBeCloseTo(11.8, 2);
    expect(Number(cierre.total_tarjeta)).toBe(0);
    expect(Number(cierre.cantidad_ventas)).toBe(3);
    // El conteo fisico del cajero si se respeta
    expect(Number(cierre.saldo_efectivo)).toBeCloseTo(23.6, 2);
  });

  it('rechaza el cierre sin rango de fechas', async () => {
    const res = await request(app).post('/api/cierre-caja').set(auth).send({
      cajero_id: cajero.id_user,
      saldo_efectivo: 0,
      estado: 'cerrado',
    });
    expect(res.status).toBe(400);
  });
});
