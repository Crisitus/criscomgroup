'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const jwt = require('jsonwebtoken');
const { gerente, admin, vendedor } = require('../fixtures/users.fixture');
const { User, AuditLog, Venta, AccessRequest, AreaGrant, AffiliateBusiness } = require('../../src/models');
const { authRequestWasSuccessful } = require('../../src/middlewares/security.middleware');

const STRONG = 'Clave-Segura-1!';
const tick = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
// Firma como el login real: incluye la version de sesion (tv) vigente de la instancia.
const hdr = (user) => ({ Authorization: `Bearer ${jwt.sign({ id: user.id_user, id_role: user.id_role, tv: Number(user.token_version || 0) }, process.env.JWT_SECRET, { expiresIn: '1h' })}` });
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();

describe('Administración › Usuarios y cuenta maestra', () => {
  let master;
  let elevated;
  let plainAdmin;
  let seller;
  const body = (extra = {}) => ({ name: 'Persona Prueba', email: `p${Date.now()}${Math.floor(Math.random() * 1e6)}@test.local`, password: STRONG, ...extra });

  beforeAll(async () => {
    await setupTestDb();
    master = await createUser(gerente);
    process.env.MASTER_ADMIN_EMAIL = master.email;
    elevated = await createUser(admin);
    await elevated.update({ superusuario_temporal: true, superusuario_expira_en: future(5) });
    plainAdmin = await createUser({ name: 'Admin Plano', email: 'plano@test.local', password: 'Admin123!', id_role: 2 });
    seller = await createUser(vendedor);
  });

  describe('C1 · alta de cuentas', () => {
    it('un Administrador normal (rol 2) no puede crear cuentas por /auth/register', async () => {
      const res = await request(app).post('/api/auth/register').set(hdr(plainAdmin)).send(body({ id_role: 1 }));
      expect(res.statusCode).toBe(403);
      expect(await User.count({ where: { id_role: 1 } })).toBe(1);
    });

    it('nadie puede crear un rol 1 (ni por /auth/register ni por /users)', async () => {
      for (const actor of [master, elevated]) {
        const a = await request(app).post('/api/auth/register').set(hdr(actor)).send(body({ id_role: 1 }));
        const b = await request(app).post('/api/users').set(hdr(actor)).send(body({ id_role: 1 }));
        expect([a.statusCode, b.statusCode]).toEqual([422, 422]);
      }
      expect(await User.count({ where: { id_role: 1 } })).toBe(1);
    });

    it('el rol 2 elevado no crea Administradores; el gerente sí', async () => {
      const denied = await request(app).post('/api/users').set(hdr(elevated)).send(body({ id_role: 2 }));
      expect(denied.statusCode).toBe(403);
      const viaRegister = await request(app).post('/api/auth/register').set(hdr(elevated)).send(body({ id_role: 2 }));
      expect(viaRegister.statusCode).toBe(403);
      const ok = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 2 }));
      expect(ok.statusCode).toBe(201);
      expect(ok.body.password).toBeUndefined();
      expect(ok.body.token_version).toBeUndefined();
    });

    it('valida correo, contraseña y rol con errores por campo', async () => {
      const res = await request(app).post('/api/users').set(hdr(master)).send({ name: 'X', email: 'no-es-correo', password: 'debil', id_role: 9 });
      expect(res.statusCode).toBe(422);
      expect(Object.keys(res.body.errores)).toEqual(expect.arrayContaining(['name', 'email', 'password', 'id_role']));
      const dup = await request(app).post('/api/users').set(hdr(master)).send(body({ email: master.email }));
      expect(dup.statusCode).toBe(409);
    });
  });

  describe('A1 · alta con perfil de acceso (Auditor/Técnico)', () => {
    it('crea un Auditor con caducidad y un Técnico con celular en una sola petición', async () => {
      const auditor = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 5, acceso_expira_en: future(3) }));
      expect(auditor.statusCode).toBe(201);
      expect(auditor.body.id_role).toBe(5);
      expect(auditor.body.acceso_expira_en).toBeTruthy();
      const tech = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 6, telefono: '987654321' }));
      expect(tech.statusCode).toBe(201);
      expect(tech.body.telefono).toBe('987654321');
    });

    it('es atómico: si falla el perfil no queda una cuenta huérfana', async () => {
      const data = body({ id_role: 6, telefono: '123' });
      const res = await request(app).post('/api/users').set(hdr(master)).send(data);
      expect(res.statusCode).toBe(422);
      expect(res.body.errores.telefono).toBeTruthy();
      expect(await User.findOne({ where: { email: data.email } })).toBeNull();
      const past = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 5, acceso_expira_en: '2020-01-01T10:00' }));
      expect(past.statusCode).toBe(422);
    });

    it('un vendedor afiliado crea su negocio en el alta', async () => {
      const res = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 3, tipo_vendedor: 'afiliado', nombre_comercial: 'Tienda Alta', comision_servicio_porcentaje: 8 }));
      expect(res.statusCode).toBe(201);
      expect(await AffiliateBusiness.count({ where: { owner_user_id: res.body.id_user } })).toBe(1);
      const nan = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 3, tipo_vendedor: 'afiliado', comision_servicio_porcentaje: 'abc' }));
      expect(nan.statusCode).toBe(422);
    });
  });

  describe('C2 · el superusuario temporal no toca la cuenta maestra ni se prorroga', () => {
    it('no puede cambiar la clave, el correo, el rol, desactivar ni borrar a la maestra', async () => {
      const before = (await User.findByPk(master.id_user)).password;
      const calls = [
        request(app).put(`/api/users/${master.id_user}`).set(hdr(elevated)).send({ name: 'Hack Maestra', email: master.email, password: 'Otra-Clave-9!' }),
        request(app).patch(`/api/users/${master.id_user}`).set(hdr(elevated)).send({ password: 'Otra-Clave-9!', id_role: 2 }),
        request(app).patch(`/api/users/${master.id_user}/role`).set(hdr(elevated)).send({ id_role: 4 }),
        request(app).patch(`/api/users/${master.id_user}/status`).set(hdr(elevated)).send({ activo: false }),
        request(app).delete(`/api/users/${master.id_user}`).set(hdr(elevated)),
      ];
      const results = await Promise.all(calls);
      expect(results.map((r) => r.statusCode)).toEqual([403, 403, 403, 403, 403]);
      const after = await User.findByPk(master.id_user);
      expect(after.password).toBe(before);
      expect(after.id_role).toBe(1);
      expect(after.activo).toBe(true);
    });

    it('no puede prorrogarse a sí mismo ni conceder elevaciones', async () => {
      const own = await request(app).patch(`/api/users/${elevated.id_user}/temporary-superuser`).set(hdr(elevated)).send({ enabled: true, expires_at: future(900) });
      expect(own.statusCode).toBe(403);
      const patch = await request(app).patch(`/api/users/${elevated.id_user}`).set(hdr(elevated)).send({ superusuario_expira_en: future(900) });
      expect(patch.statusCode).toBe(403);
      const reloaded = await User.findByPk(elevated.id_user);
      expect(new Date(reloaded.superusuario_expira_en).getTime()).toBeLessThan(Date.now() + 10 * 86400000);
      const byMaster = await request(app).patch(`/api/users/${plainAdmin.id_user}/temporary-superuser`).set(hdr(master)).send({ enabled: true, expires_at: future(2) });
      expect(byMaster.statusCode).toBe(200);
      await plainAdmin.update({ superusuario_temporal: false, superusuario_expira_en: null });
    });

    it('PATCH usa lista blanca: no escala privilegios de otro usuario ni cambia campos protegidos', async () => {
      const res = await request(app).patch(`/api/users/${seller.id_user}`).set(hdr(elevated)).send({ name: 'Vendedor Renombrado', id_role: 1, superusuario_temporal: true, acceso_expira_en: future(400), affiliate_business_id: 99 });
      expect(res.statusCode).toBe(422);
      const stillSeller = await User.findByPk(seller.id_user);
      expect(stillSeller.id_role).toBe(3);
      expect(stillSeller.superusuario_temporal).toBe(false);
      const ok = await request(app).patch(`/api/users/${seller.id_user}`).set(hdr(elevated)).send({ name: 'Vendedor Renombrado', superusuario_temporal: true, affiliate_business_id: 99 });
      expect(ok.statusCode).toBe(200);
      const reloaded = await User.findByPk(seller.id_user);
      expect(reloaded.name).toBe('Vendedor Renombrado');
      expect(reloaded.superusuario_temporal).toBe(false);
      expect(reloaded.affiliate_business_id).toBeNull();
    });

    it('no toca cuentas Administrador y la maestra real sí puede administrarlas', async () => {
      const denied = await request(app).patch(`/api/users/${plainAdmin.id_user}`).set(hdr(elevated)).send({ name: 'Cambio Ilegal' });
      expect(denied.statusCode).toBe(403);
      const ok = await request(app).patch(`/api/users/${plainAdmin.id_user}`).set(hdr(master)).send({ name: 'Admin Renombrado' });
      expect(ok.statusCode).toBe(200);
    });

    it('un Administrador sin elevación no entra a /users', async () => {
      expect((await request(app).get('/api/users').set(hdr(plainAdmin))).statusCode).toBe(403);
    });
  });

  describe('A2 · desactivar y borrar con guardas', () => {
    it('no permite borrarse a sí mismo ni a la maestra; el rol 2 elevado no borra', async () => {
      expect((await request(app).delete(`/api/users/${master.id_user}`).set(hdr(master))).statusCode).toBe(403);
      const target = await createUser({ name: 'Sin Historial', email: 'sinhistorial@test.local', password: STRONG, id_role: 3 });
      expect((await request(app).delete(`/api/users/${target.id_user}`).set(hdr(elevated))).statusCode).toBe(403);
    });

    it('bloquea el borrado con ventas (409) y ofrece desactivar; sin historial sí borra', async () => {
      const cashier = await createUser({ name: 'Cajero', email: 'cajero@test.local', password: STRONG, id_role: 3 });
      await Venta.unscoped().create({ fecha: new Date(), total: 10, total_con_igv: 11.8, id_cajero: cashier.id_user, metodo_pago: 'efectivo', tipo_documento: '0', serie: 'NV01', correlativo: 7 });
      const blocked = await request(app).delete(`/api/users/${cashier.id_user}`).set(hdr(master));
      expect(blocked.statusCode).toBe(409);
      expect(blocked.body.code).toBe('USER_HAS_HISTORY');
      expect(blocked.body.puede_desactivar).toBe(true);
      expect(blocked.body.dependencias.ventas).toBe(1);
      const free = await createUser({ name: 'Libre', email: 'libre@test.local', password: STRONG, id_role: 3 });
      expect((await request(app).delete(`/api/users/${free.id_user}`).set(hdr(master))).statusCode).toBe(200);
      expect(await User.findByPk(free.id_user)).toBeNull();
    });

    it('desactivar cierra sesiones y bloquea el login; reactivar lo devuelve', async () => {
      const victim = await createUser({ name: 'Baja', email: 'baja@test.local', password: STRONG, id_role: 3 });
      const token = (await request(app).post('/api/auth/login').send({ email: 'baja@test.local', password: STRONG })).body.token;
      expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).statusCode).toBe(200);
      expect((await request(app).patch(`/api/users/${victim.id_user}/status`).set(hdr(master)).send({ activo: false })).statusCode).toBe(200);
      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me.statusCode).toBe(403);
      const login = await request(app).post('/api/auth/login').send({ email: 'baja@test.local', password: STRONG });
      expect(login.statusCode).toBe(403);
      expect(login.body.code).toBe('ACCOUNT_DISABLED');
      expect((await request(app).patch(`/api/users/${victim.id_user}/status`).set(hdr(master)).send({ activo: true })).statusCode).toBe(200);
    });

    it('cambiar de rol limpia residuos de privilegio y de afiliado', async () => {
      const aff = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 3, tipo_vendedor: 'afiliado', nombre_comercial: 'Residuo SA' }));
      const id = aff.body.id_user;
      const changed = await request(app).patch(`/api/users/${id}/role`).set(hdr(master)).send({ id_role: 4 });
      expect(changed.statusCode).toBe(200);
      const user = await User.findByPk(id);
      expect([user.id_role, user.tipo_vendedor, user.affiliate_business_id]).toEqual([4, null, null]);
      expect((await AffiliateBusiness.findOne({ where: { owner_user_id: id } })).estado).toBe('suspendido');
      expect((await request(app).patch(`/api/users/${id}/role`).set(hdr(master)).send({ id_role: 5 })).statusCode).toBe(422);
    });
  });

  describe('C3/A6 · cuenta maestra: sin secretos en auditoría y sesiones invalidadas', () => {
    const NEW_PASS = 'Maestra-Nueva-2026!';
    it('cambiar la clave no deja contraseñas ni hashes en audit_logs y cierra las sesiones anteriores', async () => {
      const oldToken = (await request(app).post('/api/auth/login').send({ email: gerente.email, password: gerente.password })).body.token;
      const weak = await request(app).patch('/api/users/master-account').set('Authorization', `Bearer ${oldToken}`).send({ name: 'Maestra', current_password: gerente.password, new_password: 'corta1!' });
      expect(weak.statusCode).toBe(422);
      const wrong = await request(app).patch('/api/users/master-account').set('Authorization', `Bearer ${oldToken}`).send({ name: 'Maestra', current_password: 'incorrecta', new_password: NEW_PASS });
      expect(wrong.statusCode).toBe(422);
      const res = await request(app).patch('/api/users/master-account').set('Authorization', `Bearer ${oldToken}`).send({ name: 'Maestra', current_password: gerente.password, new_password: NEW_PASS });
      expect(res.statusCode).toBe(200);
      expect(res.body.sesiones_cerradas).toBe(true);
      const stale = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
      expect(stale.statusCode).toBe(401);
      expect(stale.body.code).toBe('SESSION_REVOKED');
      const fresh = await request(app).post('/api/auth/login').send({ email: gerente.email, password: NEW_PASS });
      expect(fresh.statusCode).toBe(200);
      expect(fresh.body.user.es_maestra).toBe(true);
      await tick();
      const dump = JSON.stringify((await AuditLog.findAll({ raw: true })).map((row) => [row.datos_nuevos, row.datos_anteriores]));
      for (const secret of [gerente.password, NEW_PASS, STRONG, 'Otra-Clave-9!']) expect(dump).not.toContain(secret);
      expect(dump).not.toMatch(/\$2[aby]\$\d{2}\$/);
      const events = await AuditLog.findAll({ where: { accion: 'actualizar_cuenta_maestra' }, raw: true });
      expect(events.length).toBe(1);
      expect(events[0].registro_id).toBe(master.id_user);
      master = await User.findByPk(master.id_user);
    });

    it('un Administrador elevado no entra a la ficha de la cuenta maestra', async () => {
      expect((await request(app).get('/api/users/master-account').set(hdr(elevated))).statusCode).toBe(403);
      expect((await request(app).get('/api/users/master-account').set(hdr(master))).statusCode).toBe(200);
    });

    it('cambiar la clave de un usuario por /users invalida sus sesiones y los altas quedan auditados', async () => {
      const target = await createUser({ name: 'Rota Clave', email: 'rota@test.local', password: STRONG, id_role: 3 });
      const token = (await request(app).post('/api/auth/login').send({ email: 'rota@test.local', password: STRONG })).body.token;
      expect((await request(app).patch(`/api/users/${target.id_user}`).set(hdr(master)).send({ password: 'Nueva-Clave-7!' })).statusCode).toBe(200);
      expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).statusCode).toBe(401);
      await tick();
      const logs = await AuditLog.findAll({ where: { tabla: 'usuarios' }, raw: true });
      expect(logs.some((row) => row.accion === 'crear')).toBe(true);
      expect(JSON.stringify(logs)).not.toContain('Nueva-Clave-7!');
    });
  });

  describe('Listado paginado y /auth/me', () => {
    it('pagina, busca y filtra por rol/estado en servidor, sin datos sensibles', async () => {
      for (let i = 0; i < 4; i += 1) await createUser({ name: `Lista Persona ${i}`, email: `lista${i}@test.local`, password: STRONG, id_role: 3 });
      await createUser({ name: 'Cliente Web', email: 'clienteweb@test.local', password: STRONG, id_role: 4 });
      const page = await request(app).get('/api/users?grupo=personal&limit=2&page=2').set(hdr(master));
      expect(page.statusCode).toBe(200);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.page).toBe(2);
      expect(page.body.total).toBeGreaterThan(4);
      expect(page.body.conteos.clientes).toBeGreaterThanOrEqual(1);
      for (const row of page.body.data) {
        expect(row.password).toBeUndefined();
        expect(row.token_version).toBeUndefined();
        expect(row.id_role).not.toBe(4);
      }
      const search = await request(app).get('/api/users?search=Lista Persona&rol=3').set(hdr(master));
      expect(search.body.total).toBe(4);
      const clientes = await request(app).get('/api/users?grupo=clientes').set(hdr(master));
      expect(clientes.body.data.map((r) => r.email)).toContain('clienteweb@test.local');
      expect(clientes.body.data.every((r) => r.id_role === 4)).toBe(true);
      const inactive = await request(app).get('/api/users?estado=inactivo').set(hdr(master));
      expect(inactive.body.data.every((r) => r.activo === false)).toBe(true);
      const wildcard = await request(app).get('/api/users?search=%25').set(hdr(master));
      expect(wildcard.body.total).toBe(0);
    });

    it('/auth/me devuelve es_maestra calculado por el servidor', async () => {
      const mine = await request(app).get('/api/auth/me').set(hdr(master));
      expect(mine.body.user.es_maestra).toBe(true);
      const theirs = await request(app).get('/api/auth/me').set(hdr(seller));
      expect(theirs.body.user.es_maestra).toBe(false);
      expect((await request(app).get('/api/auth/me')).statusCode).toBe(401);
    });
  });

  describe('A5 · solicitudes y permisos de área', () => {
    it('aprobar exige vigencia futura de máximo 30 días; rechazar una aprobada revoca el permiso', async () => {
      const ask = await request(app).post('/api/access/request').set(hdr(seller)).send({ area: 'inventario', reason: 'Necesito revisar el stock' });
      expect(ask.statusCode).toBe(201);
      const id = ask.body.id_request;
      expect((await request(app).patch(`/api/access/requests/${id}`).set(hdr(master)).send({ status: 'approved' })).statusCode).toBe(422);
      expect((await request(app).patch(`/api/access/requests/${id}`).set(hdr(master)).send({ status: 'approved', expires_at: future(90) })).statusCode).toBe(422);
      expect((await request(app).patch(`/api/access/requests/${id}`).set(hdr(master)).send({ status: 'quizas' })).statusCode).toBe(422);
      expect((await request(app).patch(`/api/access/requests/${id}`).set(hdr(elevated)).send({ status: 'approved', expires_at: future(5) })).statusCode).toBe(403);
      const ok = await request(app).patch(`/api/access/requests/${id}`).set(hdr(master)).send({ status: 'approved', expires_at: future(5) });
      expect(ok.statusCode).toBe(200);
      expect((await AreaGrant.findOne({ where: { user_id: seller.id_user, area: 'inventario' } })).active).toBe(true);
      expect((await request(app).patch(`/api/access/requests/${id}`).set(hdr(master)).send({ status: 'approved', expires_at: future(5) })).statusCode).toBe(409);
      const listed = await request(app).get('/api/access/requests?status=approved').set(hdr(master));
      expect(listed.body[0].permiso.estado).toBe('activo');
      const rejected = await request(app).patch(`/api/access/requests/${id}`).set(hdr(master)).send({ status: 'rejected', review_note: 'Ya no aplica' });
      expect(rejected.statusCode).toBe(200);
      expect((await AreaGrant.findOne({ where: { user_id: seller.id_user, area: 'inventario' } })).active).toBe(false);
      expect((await AccessRequest.findByPk(id)).status).toBe('rejected');
    });

    it('un cliente ecommerce no puede solicitar áreas y solo la maestra revoca', async () => {
      const customer = await createUser({ name: 'Cliente', email: 'cliente-acc@test.local', password: STRONG, id_role: 4 });
      expect((await request(app).post('/api/access/request').set(hdr(customer)).send({ area: 'ventas', reason: 'Quiero entrar' })).statusCode).toBe(403);
      const grant = await AreaGrant.create({ user_id: seller.id_user, area: 'ventas', granted_by: master.id_user, expires_at: new Date(Date.now() + 86400000), active: true });
      expect((await request(app).delete(`/api/access/grants/${grant.id_grant}`).set(hdr(elevated))).statusCode).toBe(403);
      const grants = await request(app).get('/api/access/grants').set(hdr(master));
      expect(grants.body.some((g) => g.id_grant === grant.id_grant && g.user)).toBe(true);
      expect((await request(app).delete(`/api/access/grants/${grant.id_grant}`).set(hdr(master))).statusCode).toBe(200);
      expect((await AreaGrant.findByPk(grant.id_grant)).active).toBe(false);
    });
  });

  describe('M8 · liquidaciones de afiliados', () => {
    let owner;
    let business;
    beforeAll(async () => {
      const created = await request(app).post('/api/users').set(hdr(master)).send(body({ id_role: 3, tipo_vendedor: 'afiliado', nombre_comercial: 'Liquida SA' }));
      owner = await User.findByPk(created.body.id_user);
      business = await AffiliateBusiness.findOne({ where: { owner_user_id: owner.id_user } });
      await business.update({ prueba_finaliza_en: new Date(Date.now() - 900 * 86400000), identidad_configurada: true });
    });

    it('el vencimiento es el día 10 del mes siguiente y nunca nace vencida; no liquida futuros', async () => {
      const now = new Date();
      const period = now.toISOString().slice(0, 7);
      const current = await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set(hdr(master)).send({ periodo: period });
      expect(current.statusCode).toBe(201);
      expect(current.body.periodo_cerrado).toBe(false);
      const expected = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 11, 4, 59, 59);
      expect(new Date(current.body.vence_en).getTime()).toBe(expected);
      const old = await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set(hdr(master)).send({ periodo: '2025-01' });
      expect(old.statusCode).toBe(201);
      expect(old.body.periodo_cerrado).toBe(true);
      expect(new Date(old.body.vence_en).getTime()).toBeGreaterThan(Date.now() + 9 * 86400000);
      const futureMonth = new Date(Date.now() + 70 * 86400000).toISOString().slice(0, 7);
      expect((await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set(hdr(master)).send({ periodo: futureMonth })).statusCode).toBe(422);
      expect((await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set(hdr(master)).send({ periodo: '2025-13' })).statusCode).toBe(422);
    });

    it('generar liquidaciones y validar pagos es solo de la maestra real', async () => {
      expect((await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set(hdr(elevated)).send({ periodo: '2025-02' })).statusCode).toBe(403);
      expect((await request(app).patch('/api/affiliates/payments/1/validate').set(hdr(elevated)).send({ aprobado: true })).statusCode).toBe(403);
      expect((await request(app).get('/api/affiliates').set(hdr(elevated))).statusCode).toBe(200);
    });

    it('valida el pago manual: método, referencia, comprobante y pagos pendientes duplicados', async () => {
      const settlement = await request(app).post(`/api/affiliates/${business.id_affiliate_business}/settlements`).set(hdr(master)).send({ periodo: '2025-03' });
      const url = `/api/affiliates/settlements/${settlement.body.id_settlement}/payments`;
      const pay = { monto: 0, metodo: 'transferencia', referencia: 'OP-12345' };
      expect((await request(app).post(url).set(hdr(owner)).send({ ...pay, metodo: 'bitcoin' })).statusCode).toBe(422);
      expect((await request(app).post(url).set(hdr(owner)).send({ ...pay, referencia: '' })).statusCode).toBe(422);
      expect((await request(app).post(url).set(hdr(owner)).send({ ...pay, comprobante_url: 'javascript:alert(1)' })).statusCode).toBe(422);
      const first = await request(app).post(url).set(hdr(owner)).send({ ...pay, comprobante_url: '/uploads/comprobantes/a.png' });
      expect(first.statusCode).toBe(201);
      expect((await request(app).post(url).set(hdr(owner)).send(pay)).statusCode).toBe(409);
    });
  });

  describe('M3 · límite de intentos de acceso', () => {
    it('solo cuentan los intentos fallidos (y todos los de registro)', () => {
      expect(authRequestWasSuccessful({ path: '/login' }, { statusCode: 200 })).toBe(true);
      expect(authRequestWasSuccessful({ path: '/me' }, { statusCode: 200 })).toBe(true);
      expect(authRequestWasSuccessful({ path: '/login' }, { statusCode: 401 })).toBe(false);
      expect(authRequestWasSuccessful({ path: '/register-customer' }, { statusCode: 201 })).toBe(false);
    });
  });
});
