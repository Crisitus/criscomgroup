'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { OrdenServicio, OrdenServicioRepuesto, Venta, Producto } = require('../../src/models');

describe('Orden facturada (seed-m3): no se puede cancelar desde la orden', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Gerente M3', email: 'gerente-m3@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  it('rechaza la cancelacion con stock intacto y estado sin cambiar', async () => {
    const p = await createProducto({ sku: 'SEED-M3-A', nombre: 'seed-m3 repuesto', stock: 4 });
    const orden = await OrdenServicio.create({
      tipo: 'servicio_tecnico',
      codigo: `ST-M3-${Date.now()}`,
      cliente: 'Cliente M3',
      telefono: '999999999',
      equipo: 'Laptop',
      detalle: 'Reparacion seed-m3',
      estado: 'listo',
      moneda: 'PEN',
      costo_repuestos: 100,
      costo_mano_obra: 50,
      descuento: 0,
      recargo: 0,
      adelanto: 0,
      fecha_ingreso: '2026-10-01',
      garantia_dias: 30,
      creado_por: cajero.id_user,
    });
    const venta = await Venta.create({
      fecha: new Date(),
      total: 127.12,
      total_con_igv: 150,
      id_cajero: cajero.id_user,
      metodo_pago: 'efectivo',
      tipo_documento: '0',
      serie: 'NV01',
      correlativo: 9001,
      orden_servicio_id: orden.id_orden_servicio,
    });
    await orden.update({ venta_id: venta.venta_id });
    await OrdenServicioRepuesto.create({
      id_orden_servicio: orden.id_orden_servicio,
      id_producto: p.id_producto,
      descripcion: 'Repuesto seed-m3',
      cantidad: 2,
      precio_unitario: 50,
      estado_stock: 'reservado',
      registrado_por: cajero.id_user,
    });
    await Producto.unscoped().update({ stock: 2 }, { where: { id_producto: p.id_producto } });

    const res = await request(app)
      .put(`/api/ordenes-servicio/${orden.id_orden_servicio}`)
      .set(auth)
      .send({ tipo: 'servicio_tecnico', codigo: orden.codigo, cliente: orden.cliente, equipo: orden.equipo, detalle: orden.detalle, estado: 'cancelado' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/venta contable/);

    await orden.reload();
    expect(orden.estado).toBe('listo');
    await p.reload();
    expect(Number(p.stock)).toBe(2);
    expect(await Venta.unscoped().findByPk(venta.venta_id)).not.toBeNull();
  });
});
