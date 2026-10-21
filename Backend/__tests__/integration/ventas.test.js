'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { productoConStock, productoSinStock } = require('../fixtures/productos.fixture');
const { Venta, MovimientoInventario } = require('../../src/models');

describe('POST /api/ventas', () => {
  let token;
  let gerenteUser;
  let productoStock;
  let productoVacio;
  let productoS9;
  const codigoConStock = 'CB-TEST-CON-STOCK-001';
  const codigoSinStock = 'CB-TEST-SIN-STOCK-001';
  const codigoS9 = 'CB-TEST-S9-NEG-PRICE-001';

  beforeAll(async () => {
    await setupTestDb();
    gerenteUser = await createUser(gerente);
    token = getAuthToken(gerenteUser);

    // Producto con stock=5 + código de barras con cantidad=5
    productoStock = await createProducto({ ...productoConStock, stock: 5 });
    await createCodigoBarras(productoStock.id_producto, codigoConStock, 5);

    // Producto con stock=0 + código de barras con cantidad=1
    productoVacio = await createProducto({ ...productoSinStock, stock: 0 });
    await createCodigoBarras(productoVacio.id_producto, codigoSinStock, 1);

    // Producto para S9 — precio variable negativo
    productoS9 = await createProducto({ sku: 'SKU-S9-NEG-001', nombre: 'Producto S9 Test', stock: 5 });
    await createCodigoBarras(productoS9.id_producto, codigoS9, 5);
  });

  // TEST 4 — Happy path: venta con stock suficiente → 201
  it('crea una venta correctamente cuando el stock es suficiente (201)', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cajero: gerenteUser.id_user,
        metodo_pago: 'efectivo',
        items: [{ codigo_barras: codigoConStock, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.venta).toBeDefined();
    expect(res.body.venta.venta_id).toBeDefined();
    const movement = await MovimientoInventario.findOne({
      where: { referencia_tipo: 'venta', referencia_id: res.body.venta.venta_id },
    });
    expect(movement).not.toBeNull();
    expect(movement.producto_id).toBe(productoStock.id_producto);
    expect(movement.stock_anterior).toBe(5);
    expect(movement.stock_nuevo).toBe(4);
  });

  // TEST 5 — Venta con stock=0 es rechazada correctamente → 400
  // El controlador valida stock antes de descontar. Comportamiento correcto.
  it('rechaza la venta cuando el stock del producto es 0 (400)', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cajero: gerenteUser.id_user,
        metodo_pago: 'efectivo',
        items: [{ codigo_barras: codigoSinStock, cantidad: 1 }],
      });

    // El controlador verifica producto.stock < cantidadDescontar y retorna 400
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/stock insuficiente/i);
  });

  // TEST S9 — Precio variable negativo → 400 + rollback (ninguna venta persistida)
  it('rechaza precio variable negativo con rollback — S9', async () => {
    const conteoAntes = await Venta.count();

    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cajero: gerenteUser.id_user,
        metodo_pago: 'efectivo',
        items: [{
          codigo_barras: codigoS9,
          cantidad: 1,
          precio_unitario_con_igv: -100,
        }],
      });

    expect(res.statusCode).toBe(400);

    // Rollback verificado: ninguna venta nueva en la DB
    const conteoDespues = await Venta.count();
    expect(conteoDespues).toBe(conteoAntes);
  });
});
