'use strict';

const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { OrdenServicioCredencial, OrdenServicioEvento } = require('../../src/models');

describe('Recepción y custodia estructurada', () => {
  let token;
  beforeAll(async () => {
    await setupTestDb();
    process.env.SERVICE_CREDENTIAL_KEY = 'test-only-service-vault-key';
    const master = await createUser({ ...gerente, email: 'custodia@test.local' });
    process.env.MASTER_ADMIN_EMAIL = master.email;
    token = getAuthToken(master);
  });

  it('registra inventario de recepción y mantiene la clave fuera de la orden', async () => {
    const created = await request(app).post('/api/ordenes-servicio').set('Authorization', `Bearer ${token}`).send({
      tipo: 'servicio_tecnico', codigo: 'ST-CUSTODIA-001', cliente: 'Cliente Custodia', equipo: 'Laptop',
      detalle: 'No enciende', estado_fisico: ['Golpe esquina izquierda', 'Sello intacto'],
      accesorios_recibidos: ['Cargador 65 W'], recepcion_conforme: true, estado: 'recibido', moneda: 'PEN',
      costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0, fecha_ingreso: '2026-08-28', garantia_dias: 30,
    });
    expect(created.statusCode).toBe(201);
    expect(created.body.estado_fisico).toEqual(['Golpe esquina izquierda', 'Sello intacto']);
    expect(created.body.recepcion_conforme_en).toBeTruthy();

    const saved = await request(app).post(`/api/ordenes-servicio/${created.body.id_orden_servicio}/credencial-temporal`).set('Authorization', `Bearer ${token}`).send({ secreto: '2580', horas_vigencia: 2 });
    expect(saved.statusCode).toBe(201);
    const raw = await OrdenServicioCredencial.findOne({ where: { id_orden_servicio: created.body.id_orden_servicio } });
    expect(raw.secreto_cifrado).not.toContain('2580');
    expect(created.body).not.toHaveProperty('secreto_cifrado');

    const revealed = await request(app).post(`/api/ordenes-servicio/${created.body.id_orden_servicio}/credencial-temporal/revelar`).set('Authorization', `Bearer ${token}`);
    expect(revealed.body.secreto).toBe('2580');
    expect(await OrdenServicioEvento.count({ where: { id_orden_servicio: created.body.id_orden_servicio, tipo: 'credencial_consultada' } })).toBe(1);
  });

  it('registra un mantenimiento con modalidad y checklist estructurado', async () => {
    const created = await request(app).post('/api/ordenes-servicio').set('Authorization', `Bearer ${token}`).send({
      tipo: 'mantenimiento', subtipo_trabajo: 'preventivo', tareas_solicitadas: ['limpieza_interna', 'pasta_termica'],
      codigo: 'MT-CUSTODIA-001', cliente: 'Cliente Mantenimiento', equipo: 'Laptop Lenovo', detalle: 'Mantenimiento anual',
      recepcion_conforme: true, estado: 'recibido', moneda: 'PEN', costo_repuestos: 0, costo_mano_obra: 0,
      adelanto: 0, fecha_ingreso: '2026-09-02', garantia_dias: 30,
    });
    expect(created.statusCode).toBe(201);
    expect(created.body.tipo).toBe('mantenimiento');
    expect(created.body.subtipo_trabajo).toBe('preventivo');
    expect(created.body.tareas_solicitadas).toEqual(['limpieza_interna', 'pasta_termica']);

    const invalid = await request(app).post('/api/ordenes-servicio').set('Authorization', `Bearer ${token}`).send({
      tipo: 'mantenimiento', subtipo_trabajo: 'improvisado', codigo: 'MT-CUSTODIA-002',
      cliente: 'Cliente Inválido', equipo: 'PC', detalle: 'Prueba', estado: 'recibido', moneda: 'PEN',
      costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0, fecha_ingreso: '2026-09-02', garantia_dias: 30,
    });
    expect(invalid.statusCode).toBe(400);
  });
});
