'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { Venta } = require('../../src/models');

describe('Correlativos de venta (seed-t2): nunca duplicados bajo concurrencia', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Cajero T2', email: 'cajero-t2@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  const vender = async (idx, comprobante) => {
    const p = await createProducto({ sku: `SEED-T2-${idx}`, nombre: `seed-t2 producto ${idx}`, stock: 10 });
    await createCodigoBarras(p.id_producto, `SEED-T2-BC-${idx}`, 10);
    return request(app).post('/api/ventas').set(auth).send({
      id_cajero: cajero.id_user,
      metodo_pago: 'efectivo',
      items: [{ codigo_barras: `SEED-T2-BC-${idx}`, cantidad: 1 }],
      ...(comprobante ? { comprobante } : {}),
    });
  };

  const correlativosDe = async (ids) => {
    const ventas = await Venta.unscoped().findAll({ where: { venta_id: ids }, attributes: ['serie', 'correlativo'] });
    return ventas.map(v => `${v.serie}-${v.correlativo}`);
  };

  it('6 notas de venta NV01 concurrentes obtienen correlativos distintos', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, (_, i) => vender(`NV-${i}`)));
    responses.forEach(r => expect(r.status).toBe(201));
    const ids = responses.map(r => r.body.venta.venta_id);
    const claves = await correlativosDe(ids);
    expect(new Set(claves).size).toBe(6);
    claves.forEach(c => expect(c).toMatch(/^NV01-\d+$/));
  });

  it('4 boletas B001 concurrentes obtienen correlativos distintos', async () => {
    const comprobante = {
      tipo_documento: '3',
      cliente_tipo_documento: '1',
      cliente_numero_documento: '45678901',
      cliente_nombre: 'Cliente Seed T2',
    };
    const responses = await Promise.all(Array.from({ length: 4 }, (_, i) => vender(`BOL-${i}`, comprobante)));
    responses.forEach(r => expect(r.status).toBe(201));
    const ids = responses.map(r => r.body.venta.venta_id);
    const claves = await correlativosDe(ids);
    expect(new Set(claves).size).toBe(4);
    claves.forEach(c => expect(c).toMatch(/^B001-\d+$/));
  });
});
