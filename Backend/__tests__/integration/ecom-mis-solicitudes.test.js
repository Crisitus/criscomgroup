'use strict';
// ecom-logica T3: GET /api/ecommerce/mis-solicitudes — importación + ensamble +
// servicio técnico del cliente autenticado (vínculo por email / id_usuario), paginado.
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { SolicitudImportacion, SolicitudEnsamble, SolicitudServicio } = require('../../src/models');

describe('mis-solicitudes (ecom T3)', () => {
  let cliente, otro, sinSolicitudes;
  const auth = (u) => ({ Authorization: `Bearer ${getAuthToken(u)}` });

  beforeAll(async () => {
    await setupTestDb();
    cliente = await createUser({ name: 'seed-ecom Cliente', email: 'seed-ecom-cliente@test.local', password: 'Clave123!', id_role: 3 });
    otro = await createUser({ name: 'seed-ecom Otro', email: 'seed-ecom-otro@test.local', password: 'Clave123!', id_role: 3 });
    sinSolicitudes = await createUser({ name: 'seed-ecom Vacio', email: 'seed-ecom-vacio@test.local', password: 'Clave123!', id_role: 3 });

    await SolicitudImportacion.create({
      codigo_seguimiento: 'seed-ecom-IMP-001', nombre_solicitante: 'Cliente',
      email_solicitante: 'SEED-ECOM-CLIENTE@TEST.LOCAL', // mayúsculas: prueba el LOWER()
      nombre_producto: 'GPU RTX', tipo_producto: 'componente',
    });
    await SolicitudEnsamble.create({
      codigo_seguimiento: 'seed-ecom-ENS-001', nombre_solicitante: 'Cliente',
      telefono_solicitante: '999888777', email_solicitante: 'seed-ecom-cliente@test.local',
      ciudad: 'Arequipa', modo: 'presupuesto',
    });
    await SolicitudServicio.create({
      codigo: 'seed-ecom-SER-001', cliente: 'Cliente', telefono: '999888777',
      email: 'seed-ecom-cliente@test.local', tipo_equipo: 'laptop', falla: 'No enciende',
    });
    await SolicitudImportacion.create({
      codigo_seguimiento: 'seed-ecom-IMP-OTRO', nombre_solicitante: 'Otro',
      email_solicitante: 'seed-ecom-otro@test.local', nombre_producto: 'Monitor', tipo_producto: 'monitor',
    });
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/api/ecommerce/mis-solicitudes');
    expect(res.statusCode).toBe(401);
  });

  it('lista las 3 solicitudes del cliente autenticado (case-insensitive), orden fecha DESC', async () => {
    const res = await request(app).get('/api/ecommerce/mis-solicitudes').set(auth(cliente));
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paginacion.total).toBe(3);
    const tipos = res.body.data.map((s) => s.tipo).sort();
    expect(tipos).toEqual(['ensamble', 'importacion', 'servicio']);
    for (const item of res.body.data) {
      expect(item).toMatchObject({ codigo: expect.any(String), estado: expect.any(String), fecha: expect.any(String) });
    }
    const fechas = res.body.data.map((s) => new Date(s.fecha).getTime());
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('no ve solicitudes de otro cliente', async () => {
    const res = await request(app).get('/api/ecommerce/mis-solicitudes').set(auth(cliente));
    const codigos = res.body.data.map((s) => s.codigo);
    expect(codigos).not.toContain('seed-ecom-IMP-OTRO');
  });

  it('cliente sin solicitudes: lista vacía', async () => {
    const res = await request(app).get('/api/ecommerce/mis-solicitudes').set(auth(sinSolicitudes));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.paginacion.total).toBe(0);
  });

  it('paginación: limit=2 devuelve 2 items y reporta totales', async () => {
    const res = await request(app).get('/api/ecommerce/mis-solicitudes?limit=2&page=2').set(auth(cliente));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.paginacion).toEqual({ pagina: 2, limite: 2, total: 3, paginas: 2 });
  });
});
