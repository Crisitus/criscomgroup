'use strict';
const mockSent = [];
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn(async message => { mockSent.push(message); return { messageId: 'x' }; }) })),
}));
process.env.FEATURE_LIBRO_RECLAMACIONES = 'true';

const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb, sequelize } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { ensureCommerceSchema } = require('../../src/scripts/ensure-commerce-schema');
const feriados = require('../../src/services/feriados-peru');
const svc = require('../../src/services/reclamaciones.service');
const { LibroReclamaciones, AuditLog } = require('../../src/models');

describe('Libro de reclamaciones: logica de negocio', () => {
  let auth, gerente, adminAuth, vendedorAuth;
  let n = 0;
  const base = (extra = {}) => ({
    nombre: 'Maria Quispe seed-care', email: 'maria.seed-care@example.invalid', telefono: '987654321',
    documento: '45678912', domicilio: 'Av. Ejercito 123, Arequipa', es_menor: false,
    tipo_bien: 'producto', bien: 'Laptop gamer', monto: 2500.5, tipo: 'reclamo',
    detalle: `La laptop llego con la pantalla rota (caso ${++n}).`, pedido: 'Quiero el cambio del equipo.',
    acepta_declaracion: true, ...extra,
  });
  const post = body => request(app).post('/api/ecommerce/libro-reclamaciones').send(body);
  const registrar = async (extra = {}) => (await post(base(extra)).expect(201)).body;
  const idDe = async codigo => (await LibroReclamaciones.findOne({ where: { codigo } })).id_reclamo;

  beforeAll(async () => {
    await setupTestDb();
    gerente = await createUser({ name: 'Gerente', email: 'gerente-libro@test.local', password: 'Clave123!', id_role: 1 });
    const admin = await createUser({ name: 'Admin', email: 'admin-libro@test.local', password: 'Clave123!', id_role: 2 });
    const vendedor = await createUser({ name: 'Vendedor', email: 'vend-libro@test.local', password: 'Clave123!', id_role: 3 });
    auth = { Authorization: `Bearer ${getAuthToken(gerente)}` };
    adminAuth = { Authorization: `Bearer ${getAuthToken(admin)}` };
    vendedorAuth = { Authorization: `Bearer ${getAuthToken(vendedor)}` };
  });
  beforeEach(async () => {
    await sequelize.query('DELETE FROM libro_reclamaciones');
    mockSent.length = 0;
    process.env.FEATURE_LIBRO_RECLAMACIONES = 'true';
    process.env.MAIL_MODE = 'dry';
  });
  afterAll(async () => { await sequelize.query('DELETE FROM libro_reclamaciones'); });

  it('con el flag apagado el POST publico responde 503 y no guarda nada', async () => {
    process.env.FEATURE_LIBRO_RECLAMACIONES = 'false';
    const res = await post(base()).expect(503);
    expect(res.body.message).toMatch(/no está disponible/);
    expect(await LibroReclamaciones.count()).toBe(0);
  });

  it('valida por campo en el servidor con { message, errores }', async () => {
    const malo = base({ email: 'no-es-correo', documento: '123', monto: -5, es_menor: 'true', tipo: 'otro', tipo_bien: 'x', detalle: 'corto', pedido: '', acepta_declaracion: false });
    const res = await post(malo).expect(400);
    expect(res.body.message).toBeTruthy();
    expect(Object.keys(res.body.errores).sort()).toEqual(['acepta_declaracion', 'detalle', 'documento', 'email', 'es_menor', 'monto', 'pedido', 'tipo', 'tipo_bien']);
    expect((await post(base({ es_menor: true })).expect(400)).body.errores.apoderado).toBeTruthy();
    expect((await post(base({ monto: 'abc' })).expect(400)).body.errores.monto).toBeTruthy();
    expect((await post(base({ nombre: 'x'.repeat(161) })).expect(400)).body.errores.nombre).toMatch(/160/);
    for (const documento of ['45678912', '123456789', '20123456789']) await post(base({ documento })).expect(201);
    expect(await LibroReclamaciones.count()).toBe(3);
  });

  it('asigna codigo LR-AAAA-NNNNNN correlativo por anio (hora Lima) y manda la copia al consumidor', async () => {
    const a = await registrar(); const b = await registrar();
    const anio = svc.hoyLima().slice(0, 4);
    expect(a.codigo).toBe(`LR-${anio}-000001`); expect(b.codigo).toBe(`LR-${anio}-000002`);
    expect(a.fecha).toMatch(/-05:00$/);
    expect(mockSent[0].to).toBe('maria.seed-care@example.invalid'); expect(mockSent[0].subject).toContain(a.codigo);
    const datos = svc.validar(base()).datos;
    expect((await svc.crear(datos, { ahora: new Date('2027-01-01T03:00:00Z') })).codigo).toBe('LR-2026-000003');
    expect((await svc.crear({ ...datos, descripcion: 'otro detalle largo suficiente' }, { ahora: new Date('2027-01-01T05:30:00Z') })).codigo).toBe('LR-2027-000001');
  });

  it('el vencimiento son 15 dias habiles saltando fines de semana y feriados', async () => {
    expect(feriados.sumarDiasHabiles('2026-10-10', 15)).toBe('2026-10-30'); // sabado
    expect(feriados.sumarDiasHabiles('2026-03-30', 15)).toBe('2026-04-22'); // Jueves y Viernes Santo
    expect(feriados.esFeriado('2026-04-03')).toBe(true);
    expect(feriados.esHabil('2026-10-10')).toBe(false);
    expect(feriados.sumarDiasHabiles('2026-10-02', 1)).toBe('2026-10-05');
    expect(feriados.sumarDiasHabiles('2026-10-07', 1)).toBe('2026-10-09'); // 8-oct feriado
    const r = await registrar();
    const fila = await LibroReclamaciones.findOne({ where: { codigo: r.codigo } });
    expect(String(fila.fecha_vencimiento)).toBe(svc.calcularVencimiento());
    const p = svc.plazo('pendiente', '2026-10-09', '2026-10-12'); // viernes vencido, hoy lunes
    expect(p).toMatchObject({ vencido: true, por_vencer: false }); expect(p.dias_restantes).toBeLessThan(0);
    expect(svc.plazo('pendiente', '2026-10-12', '2026-10-12')).toMatchObject({ dias_restantes: 0, vencido: false, por_vencer: true });
    expect(svc.plazo('respondido', '2026-10-09', '2026-10-12').dias_restantes).toBeNull();
  });

  it('el PUT solo acepta estado y respuesta; el resto se ignora', async () => {
    const { codigo } = await registrar(); const id = await idDe(codigo);
    const res = await request(app).put(`/api/libro-reclamaciones/${id}`).set(auth)
      .send({ estado: 'en_proceso', nombre: 'Hackeado', email: 'x@y.com', codigo: 'ZZ', descripcion: 'borrado', fecha_vencimiento: '2030-01-01' }).expect(200);
    expect(res.body.estado).toBe('en_proceso');
    const fila = await LibroReclamaciones.findByPk(id);
    expect(fila.nombre).toBe('Maria Quispe seed-care'); expect(fila.codigo).toBe(codigo);
    expect(fila.descripcion).toContain('pantalla rota'); expect(String(fila.fecha_vencimiento)).not.toBe('2030-01-01');
    await request(app).put(`/api/libro-reclamaciones/${id}`).set(auth).send({ nombre: 'solo esto' }).expect(400);
    await request(app).put(`/api/libro-reclamaciones/${id}`).set(auth).send({ estado: 'visto' }).expect(400);
    await request(app).put('/api/libro-reclamaciones/999999').set(auth).send({ estado: 'en_proceso' }).expect(404);
  });

  it('valida transiciones (409), exige respuesta y envia el correo al responder', async () => {
    const { codigo } = await registrar(); const id = await idDe(codigo);
    const put = body => request(app).put(`/api/libro-reclamaciones/${id}`).set(auth).send(body);
    await put({ estado: 'respondido' }).expect(400).then(r => expect(r.body.errores.respuesta).toBeTruthy());
    await put({ estado: 'respondido', respuesta: 'muy corta' }).expect(400);
    await put({ estado: 'en_proceso', respuesta: 'Respuesta que no corresponde al estado' }).expect(400);
    await put({ estado: 'en_proceso' }).expect(200);
    await put({ estado: 'pendiente' }).expect(409);
    await put({ estado: 'en_proceso' }).expect(409);
    mockSent.length = 0;
    const ok = await put({ estado: 'respondido', respuesta: 'Hemos revisado su caso y procederemos con el cambio del equipo.' }).expect(200);
    expect(ok.body).toMatchObject({ estado: 'respondido', respondido_por: gerente.id_user, correo: 'enviado', respondido_en_plazo: true, dias_restantes: null, vencido: false });
    expect(ok.body.fecha_respuesta).toMatch(/-05:00$/);
    expect(mockSent).toHaveLength(1); expect(mockSent[0].subject).toContain(codigo); expect(mockSent[0].text).toContain('procederemos con el cambio');
    await put({ estado: 'respondido', respuesta: 'Segunda respuesta que no debe enviarse nunca.' }).expect(409);
    await put({ estado: 'en_proceso' }).expect(409);
    await put({ estado: 'archivado' }).expect(200);
    await put({ estado: 'pendiente' }).expect(409).then(r => expect(r.body.message).toMatch(/definitiva/));
    expect(mockSent).toHaveLength(1);
  });

  it('no hay DELETE fisico y los cambios quedan auditados', async () => {
    const { codigo } = await registrar(); const id = await idDe(codigo);
    await request(app).delete(`/api/libro-reclamaciones/${id}`).set(auth).expect(404);
    expect(await LibroReclamaciones.count()).toBe(1);
    await request(app).put(`/api/libro-reclamaciones/${id}`).set(auth).send({ estado: 'archivado' }).expect(200);
    await new Promise(r => setTimeout(r, 200));
    const log = await AuditLog.findOne({ where: { tabla: 'libro_reclamaciones', accion: 'actualizar' }, order: [['id_log', 'DESC']] });
    expect(log).toBeTruthy(); expect(log.datos_anteriores).toContain(codigo); expect(String(log.registro_id)).toBe(String(id));
  });

  it('lista paginado con resumen, filtros, busqueda y extracto sin datos sensibles', async () => {
    for (let i = 0; i < 3; i++) await registrar({ nombre: `Cliente ${i} seed-care`, email: `c${i}@example.invalid`, documento: `4000000${i}`, tipo: i === 2 ? 'queja' : 'reclamo' });
    const id = await idDe(`LR-${svc.hoyLima().slice(0, 4)}-000001`);
    await request(app).put(`/api/libro-reclamaciones/${id}`).set(auth).send({ estado: 'en_proceso' }).expect(200);
    await LibroReclamaciones.update({ fecha_vencimiento: '2020-01-02' }, { where: { codigo: `LR-${svc.hoyLima().slice(0, 4)}-000002` } });
    const get = qs => request(app).get(`/api/libro-reclamaciones${qs}`).set(auth);
    const p1 = (await get('?page=1&limit=2').expect(200)).body;
    expect(p1.rows).toHaveLength(2); expect(p1.total).toBe(3); expect(p1.page).toBe(1); expect(p1.limit).toBe(2);
    expect(p1.resumen).toEqual({ total: 3, por_estado: { pendiente: 2, en_proceso: 1, respondido: 0, archivado: 0 }, vencidos: 1, por_vencer: 0 });
    expect(p1.rows[0].codigo).toMatch(/000003$/);
    expect(p1.rows[0]).toEqual(expect.objectContaining({ extracto: expect.any(String), dias_restantes: expect.any(Number), vencido: false }));
    for (const clave of ['documento', 'domicilio', 'pedido', 'descripcion', 'telefono']) expect(p1.rows[0]).not.toHaveProperty(clave);
    expect((await get('?page=2&limit=2').expect(200)).body.rows).toHaveLength(1);
    expect((await get('?estado=en_proceso').expect(200)).body.total).toBe(1);
    expect((await get('?tipo=queja').expect(200)).body.total).toBe(1);
    const vencidas = (await get('?vencido=true').expect(200)).body;
    expect(vencidas.total).toBe(1); expect(vencidas.rows[0]).toMatchObject({ vencido: true });
    expect(vencidas.rows[0].dias_restantes).toBeLessThan(0);
    for (const q of ['Cliente 1', '40000001', 'c1@example', 'LR-' + svc.hoyLima().slice(0, 4) + '-000001']) expect((await get(`?q=${encodeURIComponent(q)}`).expect(200)).body.total).toBe(1);
    expect((await get('?q=%25').expect(200)).body.total).toBe(0);
    expect((await get('?estado=zzz').expect(400)).body.errores.estado).toBeTruthy();
    const detalle = (await request(app).get(`/api/libro-reclamaciones/${id}`).set(auth).expect(200)).body;
    expect(detalle).toMatchObject({ documento: '4000000' + '0', domicilio: 'Av. Ejercito 123, Arequipa', monto: 2500.5, es_menor: false });
    expect(detalle.fecha).toMatch(/-05:00$/);
  });

  it('exporta CSV con los mismos filtros y neutraliza formulas', async () => {
    await registrar({ nombre: '=HYPERLINK("x") seed-care', email: 'csv1@example.invalid' });
    await registrar({ email: 'csv2@example.invalid', tipo: 'queja', detalle: 'Detalle de queja, con coma\ny salto de linea.' });
    const res = await request(app).get('/api/libro-reclamaciones/export.csv?tipo=queja').set(auth).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/); expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(res.text).toContain('csv2@example.invalid'); expect(res.text).not.toContain('csv1@example.invalid');
    expect(res.text).toContain('"Detalle de queja, con coma\ny salto de linea."');
    const todo = (await request(app).get('/api/libro-reclamaciones/export.csv').set(auth).expect(200)).text;
    expect(todo).toContain(`'=HYPERLINK`); expect(todo.split('\r\n').filter(Boolean)).toHaveLength(3);
    await request(app).get('/api/libro-reclamaciones/export.csv?estado=zzz').set(auth).expect(400);
  });

  it('honeypot: responde 201 sin guardar; dedupe mismo correo y detalle en 24 h devuelve 409', async () => {
    const falso = await post(base({ website: 'http://spam.example' })).expect(201);
    expect(falso.body.success).toBe(true); expect(await LibroReclamaciones.count()).toBe(0); expect(mockSent).toHaveLength(0);
    const cuerpo = base();
    await post(cuerpo).expect(201);
    expect((await post(cuerpo).expect(409)).body.message).toMatch(/24 horas/);
    await post({ ...cuerpo, email: 'otra@example.invalid' }).expect(201);
    await post({ ...cuerpo, detalle: 'Un detalle diferente sobre otro problema distinto.' }).expect(201);
    expect(await LibroReclamaciones.count()).toBe(3);
    await LibroReclamaciones.update({ fecha: new Date(Date.now() - 25 * 3600 * 1000) }, { where: { email: cuerpo.email, descripcion: cuerpo.detalle } });
    await post(cuerpo).expect(201);
  });

  it('roles 1 y 2 acceden; otro rol o sin token no', async () => {
    const { codigo } = await registrar(); const id = await idDe(codigo);
    for (const h of [auth, adminAuth]) {
      await request(app).get('/api/libro-reclamaciones').set(h).expect(200);
      await request(app).get(`/api/libro-reclamaciones/${id}`).set(h).expect(200);
    }
    await request(app).get('/api/libro-reclamaciones').set(vendedorAuth).expect(403);
    await request(app).get('/api/libro-reclamaciones/export.csv').set(vendedorAuth).expect(403);
    await request(app).put(`/api/libro-reclamaciones/${id}`).set(vendedorAuth).send({ estado: 'archivado' }).expect(403);
    await request(app).get('/api/libro-reclamaciones').expect(401);
    expect((await LibroReclamaciones.findByPk(id)).estado).toBe('pendiente');
  });

  it('el esquema es idempotente (ensureCommerceSchema dos veces) y el estado es ENUM', async () => {
    await ensureCommerceSchema(); await ensureCommerceSchema();
    const [col] = await sequelize.query("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='libro_reclamaciones' AND COLUMN_NAME='estado'", { type: 'SELECT' });
    expect(col.COLUMN_TYPE).toBe("enum('pendiente','en_proceso','respondido','archivado')");
    const idx = await sequelize.query("SELECT COUNT(*) n FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='libro_reclamaciones' AND COLUMN_NAME='codigo' AND NON_UNIQUE=0", { type: 'SELECT' });
    expect(Number(idx[0].n)).toBeGreaterThanOrEqual(1);
  });
});
