'use strict';

const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { OrdenServicio, Producto, InventarioQuant, InventarioReserva } = require('../../src/models');

describe('WMS mínimo: ubicación, lote, serie y reserva', () => {
  let token;
  let user;
  beforeAll(async () => {
    await setupTestDb();
    user = await createUser({ ...gerente, email: 'wms@test.local' });
    token = getAuthToken(user);
  });

  it('distribuye el stock y reserva/libera una unidad serializada sin duplicar saldos', async () => {
    const product = await createProducto({ sku: 'WMS-SSD-1', nombre: 'SSD serializado', stock: 2 });
    const location = await request(app).post('/api/commercial/inventory/locations')
      .set('Authorization', `Bearer ${token}`).send({ codigo: 'TALLER-A', nombre: 'Taller A', tipo: 'taller' }).expect(201);
    const quant = await request(app).put(`/api/commercial/inventory/${product.id_producto}/quant`)
      .set('Authorization', `Bearer ${token}`).send({ ubicacion_id: location.body.id_ubicacion_inventario, lote: 'LOT-26', numero_serie: 'SN-0001', disponible: 1 }).expect(200);
    const order = await OrdenServicio.create({
      tipo: 'servicio_tecnico', codigo: 'ST-WMS-1', cliente: 'Cliente WMS', equipo: 'Laptop', detalle: 'Cambio SSD',
      estado: 'en_proceso', moneda: 'PEN', costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0,
      fecha_ingreso: '2026-08-28', garantia_dias: 30, creado_por: user.id_user,
    });
    const part = await request(app).post(`/api/ordenes-servicio/${order.id_orden_servicio}/repuestos`)
      .set('Authorization', `Bearer ${token}`).send({ id_producto: product.id_producto, cantidad: 1, precio_unitario: 50, ubicacion_id: location.body.id_ubicacion_inventario, lote: 'LOT-26', numero_serie: 'SN-0001' }).expect(201);
    await product.reload();
    let storedQuant = await InventarioQuant.findByPk(quant.body.id_quant_inventario);
    expect(product.stock).toBe(1);
    expect(storedQuant.disponible).toBe(0);
    expect(storedQuant.reservado).toBe(1);
    expect(await InventarioReserva.count({ where: { repuesto_servicio_id: part.body.part.id_repuesto_servicio, estado: 'activa' } })).toBe(1);

    await request(app).post(`/api/ordenes-servicio/${order.id_orden_servicio}/repuestos/${part.body.part.id_repuesto_servicio}/retirar`)
      .set('Authorization', `Bearer ${token}`).send({ motivo: 'No compatible' }).expect(200);
    await product.reload();
    storedQuant = await InventarioQuant.findByPk(quant.body.id_quant_inventario);
    expect(product.stock).toBe(2);
    expect(storedQuant.disponible).toBe(1);
    expect(storedQuant.reservado).toBe(0);
  });

  it('impide distribuir más que el saldo global y duplicar una serie en otra ubicación', async () => {
    const product = await createProducto({ sku: 'WMS-SERIAL-2', stock: 1 });
    const first = await request(app).post('/api/commercial/inventory/locations').set('Authorization', `Bearer ${token}`).send({ codigo: 'A1', nombre: 'Almacén 1' }).expect(201);
    const second = await request(app).post('/api/commercial/inventory/locations').set('Authorization', `Bearer ${token}`).send({ codigo: 'A2', nombre: 'Almacén 2' }).expect(201);
    await request(app).put(`/api/commercial/inventory/${product.id_producto}/quant`).set('Authorization', `Bearer ${token}`).send({ ubicacion_id: first.body.id_ubicacion_inventario, numero_serie: 'UNICA-1', disponible: 1 }).expect(200);
    const duplicate = await request(app).put(`/api/commercial/inventory/${product.id_producto}/quant`).set('Authorization', `Bearer ${token}`).send({ ubicacion_id: second.body.id_ubicacion_inventario, numero_serie: 'UNICA-1', disponible: 1 });
    expect(duplicate.statusCode).toBe(400);
  });
});
