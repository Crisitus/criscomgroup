'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { Producto, CodigoBarras, MovimientoInventario } = require('../../src/models');

describe('Fuente unica de stock (seed-t3): el POS solo depende de productos.stock', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Cajero T3', email: 'cajero-t3@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  const vender = (codigo, cantidad) => request(app).post('/api/ventas').set(auth).send({
    id_cajero: cajero.id_user,
    metodo_pago: 'efectivo',
    items: [{ codigo_barras: codigo, cantidad }],
  });

  it('vende aunque la fila legada del codigo tenga cantidad 0 y productos.stock tenga unidades', async () => {
    const p = await createProducto({ sku: 'SEED-T3-A', nombre: 'seed-t3 barcode legado', stock: 3 });
    await createCodigoBarras(p.id_producto, 'SEED-T3-BC-A', 0);

    const res = await vender('SEED-T3-BC-A', 2);
    expect(res.status).toBe(201);
    await p.reload();
    expect(Number(p.stock)).toBe(1);
    const mov = await MovimientoInventario.findOne({ where: { producto_id: p.id_producto, tipo: 'venta' } });
    expect(Number(mov.stock_anterior)).toBe(3);
    expect(Number(mov.stock_nuevo)).toBe(1);
  });

  it('una compra sube productos.stock y el POS puede vender sin tocar codigos_barras', async () => {
    const p = await createProducto({ sku: 'SEED-T3-B', nombre: 'seed-t3 compra', stock: 0 });
    await createCodigoBarras(p.id_producto, 'SEED-T3-BC-B', 0);
    const sup = await request(app).post('/api/commercial/suppliers').set(auth).send({ razon_social: 'Proveedor seed-t3 SAC' }).expect(201);
    await request(app).post('/api/commercial/purchases').set(auth).send({
      proveedor_id: sup.body.id_proveedor,
      items: [{ producto_id: p.id_producto, cantidad: 4, costo_unitario: 10 }],
    }).expect(201);
    await p.reload();
    expect(Number(p.stock)).toBe(4);

    const res = await vender('SEED-T3-BC-B', 4);
    expect(res.status).toBe(201);
    await p.reload();
    expect(Number(p.stock)).toBe(0);
  });

  it('la fila del codigo de barras ya no se destruye al agotarse el stock', async () => {
    const p = await createProducto({ sku: 'SEED-T3-C', nombre: 'seed-t3 barcode persistente', stock: 1 });
    await createCodigoBarras(p.id_producto, 'SEED-T3-BC-C', 1);

    await vender('SEED-T3-BC-C', 1).expect(201);
    const fila = await CodigoBarras.findOne({ where: { codigo_barras: 'SEED-T3-BC-C' } });
    expect(fila).not.toBeNull();
    await p.reload();
    expect(Number(p.stock)).toBe(0);
  });

  it('sigue rechazando cuando productos.stock no alcanza', async () => {
    const p = await createProducto({ sku: 'SEED-T3-D', nombre: 'seed-t3 sin stock', stock: 1 });
    await createCodigoBarras(p.id_producto, 'SEED-T3-BC-D', 99);

    const res = await vender('SEED-T3-BC-D', 2);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Stock insuficiente/);
    await p.reload();
    expect(Number(p.stock)).toBe(1);
  });
});
