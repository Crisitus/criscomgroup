'use strict';

const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { ClienteServicio, ActivoTecnico } = require('../../src/models');

describe('Cliente → activo técnico → orden', () => {
  let token;
  beforeAll(async () => {
    await setupTestDb();
    const master = await createUser({ ...gerente, email: 'activos@test.local' });
    process.env.MASTER_ADMIN_EMAIL = master.email;
    token = getAuthToken(master);
  });

  it('registra el activo, lo encuentra por serie y crea la orden con instantánea legada', async () => {
    const client = await request(app).post('/api/servicio-tecnico/clientes').set('Authorization', `Bearer ${token}`).send({
      nombre: 'Cris Cliente', documento: '71881234', telefono: '959111222',
    });
    expect(client.statusCode).toBe(201);
    const asset = await request(app).post('/api/servicio-tecnico/activos').set('Authorization', `Bearer ${token}`).send({
      id_cliente_servicio: client.body.id_cliente_servicio, tipo: 'Laptop', marca: 'Lenovo', modelo: 'T14', numero_serie: 'PF-CRIS-001',
    });
    expect(asset.statusCode).toBe(201);
    const found = await request(app).get('/api/servicio-tecnico/activos?q=CRIS-001').set('Authorization', `Bearer ${token}`);
    expect(found.statusCode).toBe(200);
    expect(found.body).toHaveLength(1);
    expect(found.body[0].cliente.nombre).toBe('Cris Cliente');

    const order = await request(app).post('/api/ordenes-servicio').set('Authorization', `Bearer ${token}`).send({
      tipo: 'servicio_tecnico', codigo: 'ST-ACTIVO-001', cliente_servicio_id: client.body.id_cliente_servicio,
      activo_tecnico_id: asset.body.id_activo_tecnico, detalle: 'No enciende', estado: 'recibido', moneda: 'PEN',
      costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0, fecha_ingreso: '2026-08-28', garantia_dias: 30,
    });
    expect(order.statusCode).toBe(201);
    expect(order.body.cliente).toBe('Cris Cliente');
    expect(order.body.equipo).toBe('Laptop · Lenovo · T14');
    expect(order.body.numero_serie).toBe('PF-CRIS-001');
  });

  it('impide enlazar un activo con otro cliente', async () => {
    const a = await request(app).post('/api/servicio-tecnico/clientes').set('Authorization', `Bearer ${token}`).send({ nombre: 'Cliente A', documento: '70000001' });
    const b = await request(app).post('/api/servicio-tecnico/clientes').set('Authorization', `Bearer ${token}`).send({ nombre: 'Cliente B', documento: '70000002' });
    const asset = await request(app).post('/api/servicio-tecnico/activos').set('Authorization', `Bearer ${token}`).send({ id_cliente_servicio: a.body.id_cliente_servicio, tipo: 'Celular', imei: '359999999999991' });
    const order = await request(app).post('/api/ordenes-servicio').set('Authorization', `Bearer ${token}`).send({
      tipo: 'servicio_tecnico', codigo: 'ST-ACTIVO-002', cliente_servicio_id: b.body.id_cliente_servicio,
      activo_tecnico_id: asset.body.id_activo_tecnico, detalle: 'Pantalla rota', estado: 'recibido', moneda: 'PEN',
      costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0, fecha_ingreso: '2026-08-28', garantia_dias: 0,
    });
    expect(order.statusCode).toBe(400);
    expect(order.body.message).toMatch(/no pertenece/i);
  });

  it('estructura atómicamente una orden recibida con el contrato legado', async () => {
    const order = await request(app).post('/api/ordenes-servicio').set('Authorization', `Bearer ${token}`).send({
      tipo: 'servicio_tecnico', codigo: 'ST-LEGADO-001', cliente: 'Ingreso mostrador', documento: '74440000',
      telefono: '955444000', equipo: 'Laptop Dell Latitude', numero_serie: 'DELL-LEGACY-01', detalle: 'Se apaga',
      estado: 'recibido', moneda: 'PEN', costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0,
      fecha_ingreso: '2026-08-28', garantia_dias: 30,
    });
    expect(order.statusCode).toBe(201);
    expect(order.body.cliente_servicio_id).toBeTruthy();
    expect(order.body.activo_tecnico_id).toBeTruthy();
    expect(await ClienteServicio.count({ where: { documento: '74440000' } })).toBe(1);
    expect(await ActivoTecnico.count({ where: { numero_serie: 'DELL-LEGACY-01' } })).toBe(1);
  });
});
