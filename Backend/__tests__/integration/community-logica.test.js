'use strict';
const mockSent = [];
const mockOpts = [];
let mockFail = () => false;
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(opts => {
    mockOpts.push(opts);
    return { sendMail: jest.fn(async message => { if (mockFail(message)) throw new Error('SMTP rechazado'); mockSent.push(message); return { messageId: 'x' }; }) };
  }),
}));

const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb, sequelize } = require('../helpers/db');
const { createUser } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { ensureContentSchema } = require('../../src/scripts/ensure-content-schema');
const svc = require('../../src/services/community.service');

const ENV_KEYS = ['MAIL_MODE', 'PUBLIC_BASE_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'COMMUNITY_BATCH_SIZE'];

describe('Comunidad y correos: logica de negocio', () => {
  let auth, adminUser;
  const subscribe = (email, extra = {}) => request(app).post('/api/community/subscribe').send({ email, consentimiento: true, ...extra });
  const addMembers = async n => { for (let i = 1; i <= n; i++) await subscribe(`m${i}@example.invalid`, { nombre: `Miembro ${i}` }).expect(201); };
  const newCampaign = async (extra = {}) => (await request(app).post('/api/community/admin/campaigns').set(auth).send({ asunto: 'Hola {{nombre}}', contenido: 'Hola {{nombre}},\nNovedades', ...extra }).expect(201)).body.id_campaign;
  const waitDone = async id => {
    for (let i = 0; i < 100; i++) {
      const c = (await request(app).get(`/api/community/admin/campaigns/${id}`).set(auth)).body;
      if (c.estado !== 'enviando') return c;
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error('la campaña no termino');
  };

  beforeAll(async () => {
    await setupTestDb();
    await ensureContentSchema();
    adminUser = await createUser({ name: 'Gerente', email: 'gerente-comunidad@test.local', password: 'Clave123!', id_role: 1 });
    auth = { Authorization: `Bearer ${getAuthToken(adminUser)}` };
  });
  beforeEach(async () => {
    for (const t of ['community_deliveries', 'community_campaigns', 'community_subscribers']) await sequelize.query(`DELETE FROM ${t}`);
    mockSent.length = 0; mockOpts.length = 0; mockFail = () => false;
    for (const k of ENV_KEYS) delete process.env[k];
    process.env.MAIL_MODE = 'dry'; process.env.PUBLIC_BASE_URL = 'https://tienda.test'; process.env.COMMUNITY_BATCH_DELAY_MS = '0';
  });

  it('subscribe ignora user_id del cuerpo, lo deriva del JWT y guarda el consentimiento', async () => {
    await subscribe('a@example.invalid', { user_id: 999, consentimiento_texto: 'Acepto' }).expect(201);
    let [row] = await sequelize.query("SELECT user_id, consentimiento_texto FROM community_subscribers WHERE email='a@example.invalid'", { type: 'SELECT' });
    expect(row.user_id).toBeNull(); expect(row.consentimiento_texto).toBe('Acepto');
    await subscribe('b@example.invalid', { user_id: 999 }).set(auth).expect(201);
    [row] = await sequelize.query("SELECT user_id FROM community_subscribers WHERE email='b@example.invalid'", { type: 'SELECT' });
    expect(row.user_id).toBe(adminUser.id_user);
    await subscribe('malo').expect(400);
    await request(app).post('/api/community/subscribe').send({ email: 'c@example.invalid' }).expect(400);
  });

  it('la baja por GET solo confirma y el POST la ejecuta', async () => {
    await subscribe('baja@example.invalid').expect(201);
    const [{ unsubscribe_token: tk }] = await sequelize.query("SELECT unsubscribe_token FROM community_subscribers", { type: 'SELECT' });
    const get = await request(app).get(`/api/community/unsubscribe/${tk}`).expect(200);
    expect(get.text).toMatch(/<form method="post"/);
    let [row] = await sequelize.query("SELECT estado FROM community_subscribers", { type: 'SELECT' });
    expect(row.estado).toBe('activo');
    await request(app).post(`/api/community/unsubscribe/${tk}`).expect(200);
    [row] = await sequelize.query("SELECT estado FROM community_subscribers", { type: 'SELECT' });
    expect(row.estado).toBe('baja');
    await request(app).post(`/api/community/unsubscribe/${tk}`).expect(200);
    await request(app).get('/api/community/unsubscribe/no-existe').expect(404);
    await request(app).post(`/api/community/unsubscribe/${'0'.repeat(64)}`).expect(404);
  });

  it('lista con paginacion, busqueda y filtros, y exporta CSV', async () => {
    await addMembers(5);
    await subscribe('=cmd@example.invalid', { nombre: '=HYPERLINK("x")', fuente: 'registro' }).expect(201);
    const p1 = (await request(app).get('/api/community/admin?limit=2&page=1').set(auth).expect(200)).body;
    expect(p1.members).toHaveLength(2); expect(p1.total).toBe(6); expect(p1.mail_mode).toBe('dry'); expect(p1.smtp_configured).toBe(false);
    expect((await request(app).get('/api/community/admin?limit=2&page=3').set(auth)).body.members).toHaveLength(2);
    expect((await request(app).get('/api/community/admin?q=m3@').set(auth)).body.total).toBe(1);
    expect((await request(app).get('/api/community/admin?fuente=registro').set(auth)).body.total).toBe(1);
    expect((await request(app).get('/api/community/admin?limit=9999').set(auth)).body.limit).toBe(100);
    const csv = await request(app).get('/api/community/admin/members/export?fuente=registro').set(auth).expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toMatch(/"'=cmd@example.invalid"/); expect(csv.text).toMatch(/^\uFEFF"email"/);
    await request(app).get('/api/community/admin').expect(401);
  });

  it('solo edita y elimina campañas en borrador', async () => {
    await addMembers(1);
    const id = await newCampaign();
    await request(app).put(`/api/community/admin/campaigns/${id}`).set(auth).send({ asunto: 'Nuevo', contenido: 'Cuerpo' }).expect(200);
    await request(app).put(`/api/community/admin/campaigns/${id}`).set(auth).send({ asunto: '', contenido: 'x' }).expect(400);
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    await waitDone(id);
    await request(app).put(`/api/community/admin/campaigns/${id}`).set(auth).send({ asunto: 'X', contenido: 'Y' }).expect(409);
    await request(app).delete(`/api/community/admin/campaigns/${id}`).set(auth).expect(409);
    const draft = await newCampaign();
    await request(app).delete(`/api/community/admin/campaigns/${draft}`).set(auth).expect(200);
    await request(app).get(`/api/community/admin/campaigns/${draft}`).set(auth).expect(404);
  });

  it('envia en modo dry sin SMTP, personaliza una sola vez y agrega cabeceras de baja', async () => {
    await addMembers(3);
    const id = await newCampaign({ asunto: 'Oferta {{nombre}}' });
    const res = await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    expect(res.body).toMatchObject({ modo: 'dry', destinatarios: 3 });
    const done = await waitDone(id);
    expect(done).toMatchObject({ estado: 'enviado', enviados: 3, fallidos: 0, modo_envio: 'dry', porcentaje: 100 });
    expect(mockOpts.every(o => o.jsonTransport === true && !o.host)).toBe(true);
    const msg = mockSent.find(m => m.to === 'm1@example.invalid');
    expect(msg.subject).toBe('Oferta Miembro 1');
    expect(msg.html.match(/Hola Miembro 1/g)).toHaveLength(1);
    expect(msg.text).toMatch(/Dejar de recibir correos: https:\/\/tienda\.test\/api\/community\/unsubscribe\/[a-f0-9]{64}/);
    expect(msg.headers['List-Unsubscribe']).toMatch(/^<https:\/\/tienda\.test\/api\/community\/unsubscribe\//);
    expect(msg.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('limpia saltos de linea del asunto', async () => {
    await subscribe('crlf@example.invalid', { nombre: 'Ana\r\nBcc: x@y.z' }).expect(201);
    const id = await newCampaign({ asunto: 'Hola {{nombre}}' });
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    await waitDone(id);
    expect(mockSent[0].subject).not.toMatch(/[\r\n]/);
  });

  it('dos envios simultaneos: solo uno reclama la campaña', async () => {
    await addMembers(4);
    const id = await newCampaign();
    const results = await Promise.all([1, 2].map(() => request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth)));
    expect(results.map(r => r.status).sort()).toEqual([202, 409]);
    await waitDone(id);
    expect(mockSent).toHaveLength(4);
  });

  it('reintenta solo fallidos: estado parcial, sin duplicados, y fallido si todos fallan', async () => {
    await addMembers(3);
    const id = await newCampaign();
    mockFail = m => m.to === 'm2@example.invalid';
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    const partial = await waitDone(id);
    expect(partial).toMatchObject({ estado: 'parcial', enviados: 2, fallidos: 1 });
    expect(partial.fallos[0].email).toBe('m2@example.invalid');
    mockFail = () => false;
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    const done = await waitDone(id);
    expect(done).toMatchObject({ estado: 'enviado', enviados: 3, fallidos: 0 });
    expect(mockSent.map(m => m.to).sort()).toEqual(['m1@example.invalid', 'm2@example.invalid', 'm3@example.invalid']);
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(409);
    mockSent.length = 0; mockFail = () => true;
    const id2 = await newCampaign();
    await request(app).post(`/api/community/admin/campaigns/${id2}/send`).set(auth).expect(202);
    expect(await waitDone(id2)).toMatchObject({ estado: 'fallido', enviados: 0, fallidos: 3 });
  });

  it('no envia a miembros dados de baja y avisa si no hay nadie', async () => {
    const id = await newCampaign();
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(409);
    await addMembers(2);
    const [{ id_subscriber }] = await sequelize.query("SELECT id_subscriber FROM community_subscribers WHERE email='m1@example.invalid'", { type: 'SELECT' });
    await request(app).patch(`/api/community/admin/members/${id_subscriber}/baja`).set(auth).expect(200);
    await request(app).patch('/api/community/admin/members/99999/baja').set(auth).expect(404);
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    await waitDone(id);
    expect(mockSent.map(m => m.to)).toEqual(['m2@example.invalid']);
  });

  it('la prueba solo se envia al correo del admin o a uno autorizado', async () => {
    const id = await newCampaign();
    const bad = await request(app).post(`/api/community/admin/campaigns/${id}/test`).set(auth).send({ email: 'otro@example.invalid' });
    expect(bad.status).toBe(403); expect(mockSent).toHaveLength(0);
    await request(app).post(`/api/community/admin/campaigns/${id}/test`).set(auth).send({ email: 'no-es-correo' }).expect(400);
    const ok = await request(app).post(`/api/community/admin/campaigns/${id}/test`).set(auth).send({}).expect(200);
    expect(ok.body).toMatchObject({ destinatario: 'gerente-comunidad@test.local', modo: 'dry' });
    expect(mockSent).toHaveLength(1); expect(mockSent[0].subject).toMatch(/^\[PRUEBA\]/);
    process.env.COMMUNITY_TEST_EMAILS = 'qa@example.invalid';
    await request(app).post(`/api/community/admin/campaigns/${id}/test`).set(auth).send({ email: 'QA@example.invalid' }).expect(200);
    delete process.env.COMMUNITY_TEST_EMAILS;
    expect(mockSent.map(m => m.to)).toEqual(['gerente-comunidad@test.local', 'qa@example.invalid']);
  });

  it('en modo live exige SMTP y PUBLIC_BASE_URL (503) y nunca envia sin ellos', async () => {
    await addMembers(1);
    const id = await newCampaign();
    process.env.MAIL_MODE = 'live';
    const noSmtp = await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(503);
    expect(noSmtp.body.message).toMatch(/SMTP/);
    await request(app).post(`/api/community/admin/campaigns/${id}/test`).set(auth).send({}).expect(503);
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_USER: 'u', SMTP_PASSWORD: 'p', MAIL_FROM: 'CRISCOM <c@test.invalid>' });
    delete process.env.PUBLIC_BASE_URL;
    expect((await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(503)).body.message).toMatch(/PUBLIC_BASE_URL/);
    expect(mockSent).toHaveLength(0);
    expect((await request(app).get(`/api/community/admin/campaigns/${id}`).set(auth)).body.estado).toBe('borrador');
    process.env.PUBLIC_BASE_URL = 'https://tienda.test';
    await request(app).post(`/api/community/admin/campaigns/${id}/send`).set(auth).expect(202);
    await waitDone(id);
    expect(mockOpts.some(o => o.host === 'smtp.test')).toBe(true);
  });

  it('al arrancar marca como parcial las campañas atascadas en enviando', async () => {
    const id = await newCampaign();
    await sequelize.query("UPDATE community_campaigns SET estado='enviando' WHERE id_campaign=?", { replacements: [id] });
    expect(await svc.recoverStuckCampaigns()).toBe(1);
    expect((await request(app).get(`/api/community/admin/campaigns/${id}`).set(auth)).body.estado).toBe('parcial');
  });

  it('el registro de cliente no falla si la suscripcion a la comunidad falla', async () => {
    const controller = require('../../src/controllers/community.controller');
    const spy = jest.spyOn(controller, 'upsertSubscriber').mockRejectedValue(new Error('db caida'));
    const res = await request(app).post('/api/auth/register-customer').send({ name: 'Cliente Com', email: `com-${Date.now()}@test.local`, password: 'Secret123!', comunidad: true });
    spy.mockRestore();
    expect(res.statusCode).toBe(201); expect(res.body.success).toBe(true);
  });
});
