'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { SolicitudPostventa, MovimientoInventario } = require('../../src/models');

describe('Postventa reingreso_stock (seed-m8): el producto vuelve al inventario', () => {
  let auth;
  let cajero;

  beforeAll(async () => {
    await setupTestDb();
    cajero = await createUser({ name: 'Gerente M8', email: 'gerente-m8@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = cajero.email;
    auth = { Authorization: `Bearer ${getAuthToken(cajero)}` };
  });

  const crearSolicitud = (overrides = {}) => SolicitudPostventa.create({
    codigo_seguimiento: `POS-M8-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    nombre: 'Cliente M8',
    email: 'cliente-m8@test.local',
    telefono: '999888777',
    numero_pedido: 'PED-M8-1',
    tipo: 'devolucion',
    producto_servicio: 'seed-m8 reingreso',
    motivo: 'Llego con falla',
    detalle: 'El producto presenta falla de fabrica y el cliente solicita devolucion.',
    solucion_solicitada: 'Devolucion del dinero',
    estado: 'en_revision',
    cantidad: 2,
    vinculado: true,
    ...overrides,
  });

  it('aprobar con reingreso_stock restaura el stock con movimiento y es idempotente al resolver', async () => {
    const p = await createProducto({ sku: 'SEED-M8-A', nombre: 'seed-m8 reingreso', stock: 8 });
    await createCodigoBarras(p.id_producto, 'SEED-M8-BC-A', 8);
    const ventaRes = await request(app).post('/api/ventas').set(auth).send({
      id_cajero: cajero.id_user, metodo_pago: 'efectivo', items: [{ codigo_barras: 'SEED-M8-BC-A', cantidad: 2 }],
    }).expect(201);
    await p.reload();
    expect(Number(p.stock)).toBe(6);

    const solicitud = await crearSolicitud({ venta_id: ventaRes.body.venta.venta_id });
    const aprob = await request(app).put(`/api/postventa/${solicitud.id_solicitud}`).set(auth).send({
      estado: 'aprobada',
      respuesta_cliente: 'Aprobamos tu solicitud de devolucion.',
      accion_posterior: 'reingreso_stock',
    });
    expect(aprob.status).toBe(200);

    await p.reload();
    expect(Number(p.stock)).toBe(8);
    const mov = await MovimientoInventario.findOne({ where: { referencia_tipo: 'postventa_reingreso', referencia_id: solicitud.id_solicitud } });
    expect(mov).not.toBeNull();
    expect(Number(mov.cantidad)).toBe(2);
    expect(Number(mov.stock_anterior)).toBe(6);
    expect(Number(mov.stock_nuevo)).toBe(8);

    // Resolver despues NO duplica el reingreso (idempotencia)
    const resuelta = await request(app).put(`/api/postventa/${solicitud.id_solicitud}`).set(auth).send({
      estado: 'resuelta',
      respuesta_cliente: 'Caso resuelto y producto reingresado.',
    });
    expect(resuelta.status).toBe(200);
    expect(await MovimientoInventario.count({ where: { referencia_tipo: 'postventa_reingreso', referencia_id: solicitud.id_solicitud } })).toBe(1);
    await p.reload();
    expect(Number(p.stock)).toBe(8);
  });

  it('rechaza reingreso_stock sin venta ni pedido vinculado', async () => {
    const solicitud = await crearSolicitud({ vinculado: false, venta_id: null, pedido_id: null });
    const res = await request(app).put(`/api/postventa/${solicitud.id_solicitud}`).set(auth).send({
      estado: 'aprobada',
      respuesta_cliente: 'Aprobamos tu solicitud de devolucion.',
      accion_posterior: 'reingreso_stock',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/identificar el producto/);
  });
});
