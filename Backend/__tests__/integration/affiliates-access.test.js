'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { User, AffiliateBusiness, AffiliateSettlement, Venta } = require('../../src/models');

describe('Afiliados y accesos temporales', () => {
  let master;
  let masterToken;
  beforeAll(async () => {
    await setupTestDb();
    master = await createUser(gerente);
    process.env.MASTER_ADMIN_EMAIL = master.email;
    masterToken = getAuthToken(master);
  });

  it('aísla el negocio, liquida 8% y solo reactiva tras validar el pago', async () => {
    const affiliate = await createUser({ name: 'Afiliado', email: 'afiliado@test.local', password: 'Clave123!', id_role: 4 });
    const configured = await request(app).patch(`/api/users/${affiliate.id_user}/access-profile`).set('Authorization', `Bearer ${masterToken}`).send({ id_role: 3, tipo_vendedor: 'afiliado', nombre_comercial: 'Tienda Afiliada', comision_servicio_porcentaje: 8 });
    expect(configured.statusCode).toBe(200);
    const business = await AffiliateBusiness.findOne({ where: { owner_user_id: affiliate.id_user } });
    expect(business).toBeTruthy();
    expect(new Date(business.prueba_finaliza_en).getTime()).toBeGreaterThan(Date.now());
    const freePeriod = new Date().toISOString().slice(0, 7);
    const freeSettlement = await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set('Authorization', `Bearer ${masterToken}`).send({ periodo: freePeriod });
    expect(freeSettlement.statusCode).toBe(409);
    await business.update({ prueba_finaliza_en: new Date(Date.now() - 86400000) });
    const now = new Date();
    await Venta.unscoped().create({ fecha: now, total: 100, total_con_igv: 118, id_cajero: affiliate.id_user, metodo_pago: 'efectivo', tipo_documento: '0', serie: 'NV01', correlativo: 999, affiliate_business_id: business.id_affiliate_business, tipo_vendedor_snapshot: 'afiliado', comision_porcentaje: 8, comision_servicio: 9.44, neto_vendedor: 108.56 });
    const periodo = now.toISOString().slice(0, 7);
    const generated = await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set('Authorization', `Bearer ${masterToken}`).send({ periodo });
    expect(generated.statusCode).toBe(201);
    expect(Number(generated.body.monto_comision)).toBeCloseTo(9.44, 2);
    await business.update({ estado: 'suspendido' });
    const registered = await request(app).post(`/api/affiliates/settlements/${generated.body.id_settlement}/payments`).set('Authorization', `Bearer ${masterToken}`).send({ monto: 9.44, metodo: 'transferencia', referencia: 'OPERACION-001' });
    expect(registered.statusCode).toBe(201);
    expect((await business.reload()).estado).toBe('suspendido');
    const validated = await request(app).patch(`/api/affiliates/payments/${registered.body.id_affiliate_payment}/validate`).set('Authorization', `Bearer ${masterToken}`).send({ aprobado: true });
    expect(validated.statusCode).toBe(200);
    expect((await business.reload()).estado).toBe('activo');
    expect((await AffiliateSettlement.findByPk(generated.body.id_settlement)).estado).toBe('pagado');
  });

  it('rechaza inmediatamente un auditor cuya vigencia caducó', async () => {
    const auditor = await createUser({ name: 'Auditor', email: 'auditor@test.local', password: 'Clave123!', id_role: 5 });
    await auditor.update({ acceso_expira_en: new Date(Date.now() - 1000), acceso_otorgado_por: master.id_user });
    const res = await request(app).get('/api/productos').set('Authorization', `Bearer ${getAuthToken(auditor)}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('TEMPORARY_ACCESS_EXPIRED');
  });
});
