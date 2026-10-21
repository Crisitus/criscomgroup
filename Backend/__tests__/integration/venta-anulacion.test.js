'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { Venta, DetalleVenta, MovimientoInventario, PagoPos, AdquirentePos } = require('../../src/models');

describe('Anulacion de venta (seed-t5): revierte stock con kardex y sin huerfanos', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Gerente T5', email: 'gerente-t5@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  const vender = async (codigo, cantidad) => {
    const res = await request(app).post('/api/ventas').set(auth).send({
      id_cajero: cajero.id_user,
      metodo_pago: 'efectivo',
      items: [{ codigo_barras: codigo, cantidad }],
    });
    expect(res.status).toBe(201);
    return res.body.venta.venta_id;
  };

  it('anula un ticket NV01: stock restaurado con movimiento de reversa y venta eliminada', async () => {
    const p = await createProducto({ sku: 'SEED-T5-A', nombre: 'seed-t5 anulable', stock: 5 });
    await createCodigoBarras(p.id_producto, 'SEED-T5-BC-A', 5);
    const ventaId = await vender('SEED-T5-BC-A', 2);
    await p.reload();
    expect(Number(p.stock)).toBe(3);

    const res = await request(app).delete(`/api/ventas/${ventaId}`).set(auth);
    expect(res.status).toBe(200);

    await p.reload();
    expect(Number(p.stock)).toBe(5);
    const reversa = await MovimientoInventario.findOne({ where: { producto_id: p.id_producto, referencia_tipo: 'anulacion_venta', referencia_id: ventaId } });
    expect(reversa).not.toBeNull();
    expect(Number(reversa.stock_anterior)).toBe(3);
    expect(Number(reversa.stock_nuevo)).toBe(5);
    expect(await Venta.unscoped().findByPk(ventaId)).toBeNull();
    expect(await DetalleVenta.count({ where: { venta_id: ventaId } })).toBe(0);
  });

  it('no toca la columna legada codigos_barras.cantidad al anular', async () => {
    const p = await createProducto({ sku: 'SEED-T5-B', nombre: 'seed-t5 barcode intacto', stock: 4 });
    const bc = await createCodigoBarras(p.id_producto, 'SEED-T5-BC-B', 7);
    const ventaId = await vender('SEED-T5-BC-B', 1);

    await request(app).delete(`/api/ventas/${ventaId}`).set(auth).expect(200);
    await bc.reload();
    expect(Number(bc.cantidad)).toBe(7);
    await p.reload();
    expect(Number(p.stock)).toBe(4);
  });

  it('elimina el PagoPos ligado a la venta (sin huerfanos)', async () => {
    const p = await createProducto({ sku: 'SEED-T5-C', nombre: 'seed-t5 con pago', stock: 2 });
    await createCodigoBarras(p.id_producto, 'SEED-T5-BC-C', 2);
    const ventaId = await vender('SEED-T5-BC-C', 1);
    const adq = await AdquirentePos.create({ nombre: 'POS seed-t5', comision_porcentaje: 3.5, activo: true });
    await PagoPos.create({ venta_id: ventaId, id_adquirente: adq.id_adquirente, canal: 'pos', numero_operacion: `OP-T5-${ventaId}`, monto_centimos: 1180, registrado_por: cajero.id_user });

    await request(app).delete(`/api/ventas/${ventaId}`).set(auth).expect(200);
    expect(await PagoPos.count({ where: { venta_id: ventaId } })).toBe(0);
  });

  it('bloquea ventas con comprobante emitido', async () => {
    const p = await createProducto({ sku: 'SEED-T5-D', nombre: 'seed-t5 emitida', stock: 3 });
    await createCodigoBarras(p.id_producto, 'SEED-T5-BC-D', 3);
    const ventaId = await vender('SEED-T5-BC-D', 1);
    await Venta.unscoped().update({ comprobante_emitido: true, tipo_documento: '3' }, { where: { venta_id: ventaId } });

    const res = await request(app).delete(`/api/ventas/${ventaId}`).set(auth);
    expect(res.status).toBe(400);
    await p.reload();
    expect(Number(p.stock)).toBe(2);
  });

  it('no explota con lineas de servicio sin producto (detalle.producto_id null)', async () => {
    const p = await createProducto({ sku: 'SEED-T5-E', nombre: 'seed-t5 mixta', stock: 2 });
    await createCodigoBarras(p.id_producto, 'SEED-T5-BC-E', 2);
    const ventaId = await vender('SEED-T5-BC-E', 1);
    await DetalleVenta.create({ venta_id: ventaId, producto_id: null, descripcion: 'Mano de obra seed-t5', cantidad: 1, precio_unitario: 50, precio_unitario_con_igv: 59, subtotal: 50, subtotal_con_igv: 59 });

    const res = await request(app).delete(`/api/ventas/${ventaId}`).set(auth);
    expect(res.status).toBe(200);
    await p.reload();
    expect(Number(p.stock)).toBe(2);
  });
});
