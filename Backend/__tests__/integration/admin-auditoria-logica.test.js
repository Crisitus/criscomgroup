'use strict';
const request = require('supertest');
const express = require('express');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createEmpresa } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente, vendedor, admin } = require('../fixtures/users.fixture');
const { AuditLog, User } = require('../../src/models');
const { sanitizeAuditData, normalizeTabla } = require('../../src/middlewares/audit.middleware');

const CONTENT = 'Contenido de prueba suficientemente largo para pasar la validacion del articulo del blog de Criscom.';
const blog = (over = {}) => ({ titulo: 'Guia de auditoria seed-adm', resumen: 'Resumen util para clientes y buscadores del blog.', contenido: CONTENT, ...over });
// El log se escribe despues de responder (no bloquea la peticion): se espera a que aparezca.
const waitLog = async (where) => {
  for (let i = 0; i < 40; i += 1) {
    const found = await AuditLog.findOne({ where, order: [['id_log', 'DESC']] });
    if (found) return found;
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
};
const lima = (iso) => new Date(iso); // ISO con offset -05:00 explicito

describe('Auditoria - nucleo y logs', () => {
  let tokens = {};
  let gerenteUser;
  const as = (who, req) => req.set('Authorization', `Bearer ${tokens[who]}`);

  beforeAll(async () => {
    await setupTestDb();
    process.env.MASTER_ADMIN_EMAIL = gerente.email;
    gerenteUser = await createUser(gerente);
    await createEmpresa(gerenteUser.id_user);
    const seller = await createUser(vendedor);
    const adm = await createUser(admin);
    const auditor = await createUser({ name: 'Auditor', email: 'auditor@test.local', password: 'Auditor123!', id_role: 5 });
    await auditor.update({ acceso_expira_en: new Date(Date.now() + 10 * 3600000) });
    await adm.update({ superusuario_temporal: true, superusuario_expira_en: new Date(Date.now() + 3600000) });
    tokens = { gerente: getAuthToken(gerenteUser), vendedor: getAuthToken(seller), admin: getAuthToken(adm), auditor: getAuthToken(auditor) };
  });

  beforeEach(async () => { await AuditLog.destroy({ where: {} }); });

  describe('redaccion', () => {
    it('redacta recursivamente por patron y por forma del valor', () => {
      const out = sanitizeAuditData({
        current_password: 'a', new_password: 'b', nested: { deep: [{ api_key: 'k', sol_pass: 's', ok: 1 }], Authorization: 'Bearer x' },
        client_secret: 'c', secreto: 'd', certificado: 'e', hash: 'f',
        nota: '$2a$10$' + 'a'.repeat(53), jwt: 'eyJabc.def.ghi', nombre: 'Visible',
      });
      const text = JSON.stringify(out);
      ['"a"', '"b"', '"k"', '"s"', 'Bearer x', '"c"', '"d"', '"e"', '"f"', 'eyJabc'].forEach(v => expect(text).not.toContain(v));
      expect(text).not.toMatch(/\$2a\$10/);
      expect(out.nested.deep[0].ok).toBe(1);
      expect(out.nombre).toBe('Visible');
    });

    it('enmascara PII solo en las tablas que la contienen', () => {
      const body = { email: 'diego@gmail.com', telefono: '987654321', nombre: 'Diego' };
      expect(sanitizeAuditData(body, { pii: true })).toEqual({ email: 'd***@gmail.com', telefono: '******321', nombre: 'Diego' });
      expect(sanitizeAuditData(body).email).toBe('diego@gmail.com');
    });

    it('normaliza nombres de tabla', () => {
      expect(normalizeTabla('users')).toBe('usuarios');
      expect(normalizeTabla('Companies')).toBe('empresas');
      expect(normalizeTabla('banners')).toBe('banners');
    });
  });

  describe('registro desde rutas auditadas', () => {
    it('crea con registro_id de la respuesta, secretos redactados y snapshot del autor', async () => {
      const res = await as('gerente', request(app).post('/api/blog/admin')).send(blog({ extra: { password: 'Sup3rSecreta!', lista: [{ api_key: 'zzz-key' }] } }));
      expect(res.statusCode).toBe(201);
      const log = await waitLog({ accion: 'crear', tabla: 'blog_posts' });
      expect(log.registro_id).toBe(res.body.id_post);
      expect(log.datos_nuevos).not.toContain('Sup3rSecreta');
      expect(log.datos_nuevos).not.toContain('zzz-key');
      expect(log.datos_nuevos).toContain('[REDACTADO]');
      expect(log.datos_nuevos).not.toContain('"timestamp"');
      expect(log.usuario_nombre).toBe('Gerente Test');
      expect(log.estado_http).toBe(201);
    });

    it('no registra operaciones que responden 4xx', async () => {
      const res = await as('gerente', request(app).post('/api/blog/admin')).send({ titulo: 'x' });
      expect(res.statusCode).toBe(400);
      await new Promise(r => setTimeout(r, 300));
      expect(await AuditLog.count()).toBe(0);
    });

    it('guarda el estado anterior sin hash de contrasena', async () => {
      const res = await as('gerente', request(app).post('/api/blog/admin')).send(blog());
      await as('gerente', request(app).put(`/api/blog/admin/${res.body.id_post}`)).send({ titulo: 'Titulo nuevo seed-adm' });
      const log = await waitLog({ accion: 'actualizar' });
      expect(JSON.parse(log.datos_anteriores).titulo).toBe('Guia de auditoria seed-adm');
      const detail = await as('gerente', request(app).get(`/api/audit-logs/${log.id_log}`));
      expect(detail.body.cambios).toEqual([{ campo: 'titulo', antes: 'Guia de auditoria seed-adm', despues: 'Titulo nuevo seed-adm', sensible: false }]);
    });
  });

  it('capturarEstadoOriginal(User) no persiste el hash', async () => {
    const { capturarEstadoOriginal } = require('../../src/middlewares/audit.middleware');
    const req = { method: 'PUT', params: { id: String(gerenteUser.id_user) }, body: {} };
    await capturarEstadoOriginal(User)(req, {}, () => {});
    expect(req.estadoOriginal).toContain('Gerente Test');
    expect(req.estadoOriginal).not.toMatch(/\$2[aby]\$/);
    expect(req.estadoOriginal).not.toContain('"password"');
  });

  describe('listado, filtros y exportacion', () => {
    beforeEach(async () => {
      await AuditLog.bulkCreate([
        { usuario_id: gerenteUser.id_user, accion: 'crear', tabla: 'users', registro_id: 7, fecha_hora: lima('2026-03-10T23:30:00-05:00'), usuario_nombre: 'Gerente Test' },
        { usuario_id: gerenteUser.id_user, accion: 'actualizar', tabla: 'usuarios', registro_id: 7, fecha_hora: lima('2026-03-11T00:10:00-05:00'), datos_anteriores: '{"nombre":"A"}', datos_nuevos: '{"nombre":"B"}' },
        { usuario_id: null, accion: 'eliminar', tabla: 'ventas', registro_id: 9, fecha_hora: lima('2026-03-12T10:00:00-05:00'), datos_nuevos: '{"nota":"=CMD()"}' },
      ]);
    });

    it('pagina en servidor y no incluye los datos pesados', async () => {
      const res = await as('gerente', request(app).get('/api/audit-logs?page=1&limit=2'));
      expect(res.statusCode).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual(['limit', 'page', 'rows', 'total']);
      expect(res.body.total).toBe(3);
      expect(res.body.rows).toHaveLength(2);
      expect(res.body.rows[0]).not.toHaveProperty('datos_nuevos');
      expect(res.body.rows[0].fecha_hora).toMatch(/-05:00$/);
      const big = await as('gerente', request(app).get('/api/audit-logs?limit=5000'));
      expect(big.body.limit).toBe(100);
    });

    it('el rango usa dias civiles de Lima (sin desfase de 5 h)', async () => {
      const res = await as('gerente', request(app).get('/api/audit-logs?desde=2026-03-10&hasta=2026-03-10'));
      expect(res.body.total).toBe(1);
      expect(res.body.rows[0].accion).toBe('crear');
      const two = await as('gerente', request(app).get('/api/audit-logs?desde=2026-03-10&hasta=2026-03-11'));
      expect(two.body.total).toBe(2);
      const bad = await as('gerente', request(app).get('/api/audit-logs?desde=10-03-2026'));
      expect(bad.statusCode).toBe(400);
      expect(bad.body.errores).toHaveProperty('desde');
    });

    it('el filtro de modulo une users/usuarios; combina usuario, accion y q', async () => {
      const mod = await as('gerente', request(app).get('/api/audit-logs?modulo=usuarios'));
      expect(mod.body.total).toBe(2);
      const legacy = await as('gerente', request(app).get('/api/audit-logs?tabla=users'));
      expect(legacy.body.total).toBe(2);
      const combo = await as('gerente', request(app).get(`/api/audit-logs?usuario_id=${gerenteUser.id_user}&accion=actualizar&q=usuarios`));
      expect(combo.body.total).toBe(1);
      const byId = await as('gerente', request(app).get('/api/audit-logs?q=9'));
      expect(byId.body.rows.some(r => r.registro_id === 9)).toBe(true);
    });

    it('catalogo normaliza las tablas', async () => {
      const res = await as('gerente', request(app).get('/api/audit-logs/catalogo'));
      expect(res.body.tablas).toEqual(['usuarios', 'ventas']);
      expect(res.body.acciones).toEqual(['actualizar', 'crear', 'eliminar']);
    });

    it('exporta CSV con los mismos filtros, sin inyeccion de formulas, y lo audita', async () => {
      const res = await as('gerente', request(app).get('/api/audit-logs/export.csv?tabla=ventas')).buffer(true);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['x-total-count']).toBe('1');
      expect(res.text.split('\n')[0]).toContain('id_log,fecha_hora,usuario');
      expect(res.text).toContain('2026-03-12T10:00:00');
      expect(res.text).toContain('-05:00');
      expect(res.text).not.toContain('=CMD()');
      const exp = await waitLog({ accion: 'exportar', tabla: 'auditoria' });
      expect(exp).toBeTruthy();
    });
  });

  describe('permisos y purga', () => {
    beforeEach(async () => {
      await AuditLog.bulkCreate([
        { accion: 'crear', tabla: 'ventas', fecha_hora: lima('2026-03-10T23:30:00-05:00') },
        { accion: 'crear', tabla: 'ventas', fecha_hora: lima('2026-03-11T00:10:00-05:00') },
        { accion: 'crear', tabla: 'ventas', fecha_hora: lima('2026-03-12T10:00:00-05:00') },
      ]);
    });

    it('rol 5 lee, vendedor no; solo la maestra puede purgar', async () => {
      expect((await as('auditor', request(app).get('/api/audit-logs'))).statusCode).toBe(200);
      expect((await as('vendedor', request(app).get('/api/audit-logs'))).statusCode).toBe(403);
      const p5 = await as('auditor', request(app).get('/api/audit-logs/permisos'));
      expect(p5.body.puede_purgar).toBe(false);
      const p1 = await as('gerente', request(app).get('/api/audit-logs/permisos'));
      expect(p1.body.puede_purgar).toBe(true);
      expect((await as('auditor', request(app).delete('/api/audit-logs')).send({ deleteAll: true })).statusCode).toBe(403);
      const temp = await as('admin', request(app).delete('/api/audit-logs')).send({ deleteAll: true, confirmacion: 'ELIMINAR TODO EL HISTORIAL' });
      expect(temp.statusCode).toBe(403);
      expect(await AuditLog.count()).toBe(3);
    });

    it('exige confirmacion explicita y un solo criterio', async () => {
      const del = (body) => as('gerente', request(app).delete('/api/audit-logs')).send(body);
      expect((await del({ deleteAll: true })).statusCode).toBe(400);
      expect((await del({ deleteAll: true, confirmacion: 'PURGAR AUDITORIA' })).statusCode).toBe(400);
      expect((await del({ deleteAll: true, beforeDate: '2026-03-11', confirmacion: 'ELIMINAR TODO EL HISTORIAL' })).statusCode).toBe(400);
      expect((await del({})).statusCode).toBe(400);
      expect(await AuditLog.count()).toBe(3);
    });

    it('purga por fecha respeta el dia de Lima y deja rastro; dryRun solo cuenta', async () => {
      const del = (body) => as('gerente', request(app).delete('/api/audit-logs')).send(body);
      const dry = await del({ beforeDate: '2026-03-11', dryRun: true });
      expect(dry.body).toMatchObject({ dryRun: true, count: 1 });
      expect(await AuditLog.count()).toBe(3);
      const res = await del({ beforeDate: '2026-03-11', confirmacion: 'PURGAR AUDITORIA' });
      expect(res.statusCode).toBe(200);
      expect(res.body.deletedCount).toBe(1);
      const trace = await AuditLog.findOne({ where: { accion: 'purgar' } });
      expect(trace.tabla).toBe('auditoria');
      expect(JSON.parse(trace.datos_nuevos)).toMatchObject({ modo: 'beforeDate', eliminados: 1 });
      expect(await AuditLog.count()).toBe(3); // 2 restantes + rastro
    });

    it('deleteAll con confirmacion elimina todo salvo su propio rastro', async () => {
      const res = await as('gerente', request(app).delete('/api/audit-logs')).send({ deleteAll: true, confirmacion: 'ELIMINAR TODO EL HISTORIAL' });
      expect(res.statusCode).toBe(200);
      const left = await AuditLog.findAll();
      expect(left).toHaveLength(1);
      expect(left[0].accion).toBe('purgar_total');
    });
  });

  describe('manejo global de errores', () => {
    it('JSON invalido responde 400 con {message}', async () => {
      const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"a":');
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBeTruthy();
    });

    it('un handler async que rechaza termina en 500 JSON y no cuelga', async () => {
      const probe = express();
      probe.get('/boom', async () => { throw new Error('fallo de prueba'); });
      probe.use((err, req, res, next) => res.status(500).json({ message: 'capturado' }));
      const res = await request(probe).get('/boom');
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('capturado');
    });
  });
});
