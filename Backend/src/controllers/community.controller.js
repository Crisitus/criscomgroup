const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');
const mail = require('../services/mail.service');
const svc = require('../services/community.service');

const { cleanEmail, cleanText, select, upsertSubscriber } = svc;
const TOKEN_RE = /^[a-f0-9]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const csvCell = value => {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const escapeLike = value => String(value).replace(/[\\%_]/g, char => `\\${char}`);
const mailInfo = () => ({ mail_mode: mail.getMailMode(), smtp_configured: mail.smtpConfigured(), public_base_url_configured: Boolean(mail.publicBaseUrl()) });
const page = html => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRISCOM</title></head><body><main style="font-family:Arial;max-width:600px;margin:60px auto;padding:0 16px">${html}</main></body></html>`;

// user_id solo se deriva de un JWT valido; nunca del cuerpo de la peticion publica.
function optionalUserId(req) {
  const header = req.header('Authorization');
  if (!header) return null;
  try {
    const decoded = jwt.verify(header.startsWith('Bearer ') ? header.slice(7) : header, process.env.JWT_SECRET);
    return decoded.id || null;
  } catch { return null; }
}

exports.subscribe = async (req, res) => {
  const email = cleanEmail(req.body.email);
  if (!EMAIL_RE.test(email) || email.length > 180) return res.status(400).json({ message: 'Ingresa un correo válido' });
  if (req.body.consentimiento !== true) return res.status(400).json({ message: 'Debes aceptar recibir comunicaciones' });
  await upsertSubscriber({ email, nombre: req.body.nombre, fuente: req.body.fuente || 'footer', userId: optionalUserId(req), consentText: req.body.consentimiento_texto, ip: req.ip });
  return res.status(201).json({ success: true, message: 'Ya formas parte de la comunidad CRISCOM' });
};

const tokenParam = req => (TOKEN_RE.test(String(req.params.token || '')) ? req.params.token : null);

exports.unsubscribeConfirm = async (req, res) => {
  const found = tokenParam(req) && (await select('SELECT id_subscriber FROM community_subscribers WHERE unsubscribe_token=? LIMIT 1', [req.params.token]))[0];
  res.set('Cache-Control', 'no-store');
  if (!found) return res.status(404).type('html').send(page('<h1>Enlace no válido</h1><p>El enlace de baja no existe o ya no es válido.</p>'));
  return res.type('html').send(page(`<h1>¿Dejar de recibir correos?</h1><p>Confirma para dejar de recibir correos de la comunidad CRISCOM.</p><form method="post" action="/api/community/unsubscribe/${req.params.token}"><button type="submit" style="padding:12px 20px;font-size:16px;cursor:pointer">Confirmar baja</button></form>`));
};

exports.unsubscribe = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const valid = tokenParam(req);
  if (valid) await sequelize.query("UPDATE community_subscribers SET estado='baja', baja_en=COALESCE(baja_en, NOW()) WHERE unsubscribe_token=?", { replacements: [valid] });
  const found = valid && (await select("SELECT 1 AS ok FROM community_subscribers WHERE unsubscribe_token=? AND estado='baja'", [valid]))[0];
  if (!found) return res.status(404).type('html').send(page('<h1>Enlace no válido</h1><p>El enlace de baja no existe o ya no es válido.</p>'));
  return res.type('html').send(page('<h1>Suscripción cancelada</h1><p>Ya no recibirás correos de la comunidad CRISCOM.</p>'));
};

function memberFilter(query) {
  const where = [], params = [];
  const q = cleanText(query.q, 100);
  if (q) { where.push("(email LIKE ? ESCAPE '\\\\' OR nombre LIKE ? ESCAPE '\\\\')"); params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`); }
  if (['activo', 'baja'].includes(query.estado)) { where.push('estado=?'); params.push(query.estado); }
  const fuente = cleanText(query.fuente, 50);
  if (fuente) { where.push('fuente=?'); params.push(fuente); }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

exports.list = async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const pageNumber = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { clause, params } = memberFilter(req.query);
  const members = await select(`SELECT id_subscriber,email,nombre,fuente,estado,consentimiento_en,baja_en FROM community_subscribers ${clause} ORDER BY creado_en DESC, id_subscriber DESC LIMIT ${limit} OFFSET ${(pageNumber - 1) * limit}`, params);
  const total = Number((await select(`SELECT COUNT(*) AS total FROM community_subscribers ${clause}`, params))[0].total);
  const [counts] = await select("SELECT COALESCE(SUM(estado='activo'),0) AS activos, COALESCE(SUM(estado='baja'),0) AS bajas FROM community_subscribers");
  const campaigns = await select('SELECT * FROM community_campaigns ORDER BY creado_en DESC LIMIT 50');
  return res.json({ members, total, page: pageNumber, limit, activos: Number(counts.activos), bajas: Number(counts.bajas), campaigns, ...mailInfo() });
};

const campaignId = req => { const id = Number(req.params.id); return Number.isInteger(id) && id > 0 ? id : null; };
const loadCampaign = async id => (id ? (await select('SELECT * FROM community_campaigns WHERE id_campaign=? LIMIT 1', [id]))[0] : undefined);
const campaignInput = body => ({ asunto: cleanText(body.asunto, 180), contenido: cleanText(body.contenido, 50000) });

exports.createCampaign = async (req, res) => {
  const { asunto, contenido } = campaignInput(req.body);
  if (!asunto || !contenido) return res.status(400).json({ message: 'Asunto y contenido son obligatorios' });
  const [id] = await sequelize.query('INSERT INTO community_campaigns (asunto,contenido,creado_por) VALUES (?,?,?)', { replacements: [asunto, contenido, req.user.id] });
  return res.status(201).json({ id_campaign: id, asunto, contenido, estado: 'borrador' });
};

exports.getCampaign = async (req, res) => {
  const campaign = await loadCampaign(campaignId(req));
  if (!campaign) return res.status(404).json({ message: 'Campaña no encontrada' });
  const p = await svc.progress(campaign.id_campaign);
  const pendientes = campaign.estado === 'borrador' ? 0 : Math.max(0, campaign.destinatarios - p.enviados - p.fallidos);
  const fallos = await select("SELECT d.subscriber_id, s.email, d.error FROM community_deliveries d JOIN community_subscribers s ON s.id_subscriber=d.subscriber_id WHERE d.campaign_id=? AND d.estado='fallido' ORDER BY d.id_delivery LIMIT 50", [campaign.id_campaign]);
  const porcentaje = campaign.destinatarios ? Math.min(100, Math.round(((p.enviados + p.fallidos) / campaign.destinatarios) * 100)) : 0;
  return res.json({ ...campaign, enviados: p.enviados, fallidos: p.fallidos, pendientes, porcentaje, fallos, ...mailInfo() });
};

exports.updateCampaign = async (req, res) => {
  const campaign = await loadCampaign(campaignId(req));
  if (!campaign) return res.status(404).json({ message: 'Campaña no encontrada' });
  if (campaign.estado !== 'borrador') return res.status(409).json({ message: 'Solo se pueden editar campañas en borrador' });
  const { asunto, contenido } = campaignInput(req.body);
  if (!asunto || !contenido) return res.status(400).json({ message: 'Asunto y contenido son obligatorios' });
  await sequelize.query("UPDATE community_campaigns SET asunto=?, contenido=? WHERE id_campaign=? AND estado='borrador'", { replacements: [asunto, contenido, campaign.id_campaign] });
  return res.json({ id_campaign: campaign.id_campaign, asunto, contenido, estado: 'borrador' });
};

exports.deleteCampaign = async (req, res) => {
  const campaign = await loadCampaign(campaignId(req));
  if (!campaign) return res.status(404).json({ message: 'Campaña no encontrada' });
  if (campaign.estado !== 'borrador') return res.status(409).json({ message: 'Solo se pueden eliminar campañas en borrador' });
  await sequelize.query("DELETE FROM community_campaigns WHERE id_campaign=? AND estado='borrador'", { replacements: [campaign.id_campaign] });
  return res.json({ success: true });
};

exports.sendCampaign = async (req, res) => {
  const id = campaignId(req);
  if (!id) return res.status(404).json({ message: 'Campaña no encontrada' });
  const result = await svc.startCampaign(id);
  return res.status(result.status).json(result.body);
};

exports.testCampaign = async (req, res) => {
  const campaign = await loadCampaign(campaignId(req));
  if (!campaign) return res.status(404).json({ message: 'Campaña no encontrada' });
  // requireAdminAccess reemplaza req.user por el payload del JWT (sin email): se lee de la BD.
  const own = cleanEmail((await select('SELECT email FROM users WHERE id_user=? LIMIT 1', [req.user.id]))[0]?.email);
  const email = cleanEmail(req.body.email) || own;
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Ingresa un correo válido' });
  const allowed = new Set([own, ...String(process.env.COMMUNITY_TEST_EMAILS || '').split(',').map(cleanEmail)].filter(Boolean));
  if (!allowed.has(email)) return res.status(403).json({ message: 'La prueba solo puede enviarse a tu propio correo o a un correo de prueba autorizado' });
  const mode = mail.getMailMode();
  const blocker = mail.sendBlocker(mode);
  if (blocker) return res.status(blocker.status).json({ message: blocker.message, modo: mode });
  try {
    await mail.createTransport(mode).sendMail(mail.buildMessage(campaign, { email, nombre: 'Prueba', unsubscribe_token: '0'.repeat(64) }, { subjectPrefix: '[PRUEBA] ' }));
  } catch (error) {
    console.error('[community] Fallo del envio de prueba', error.message);
    return res.status(502).json({ message: 'No se pudo enviar la prueba', modo: mode });
  }
  return res.json({ success: true, message: mode === 'live' ? 'Prueba enviada' : 'Prueba simulada: ningún correo salió del servidor', destinatario: email, modo: mode });
};

exports.memberBaja = async (req, res) => {
  const id = Number(req.params.id);
  const member = Number.isInteger(id) && id > 0 && (await select('SELECT id_subscriber FROM community_subscribers WHERE id_subscriber=?', [id]))[0];
  if (!member) return res.status(404).json({ message: 'Miembro no encontrado' });
  await sequelize.query("UPDATE community_subscribers SET estado='baja', baja_en=COALESCE(baja_en, NOW()) WHERE id_subscriber=?", { replacements: [id] });
  return res.json({ success: true, id_subscriber: id, estado: 'baja' });
};

exports.exportMembers = async (req, res) => {
  const { clause, params } = memberFilter(req.query);
  const rows = await select(`SELECT email,nombre,estado,fuente,consentimiento_en,baja_en,consentimiento_texto FROM community_subscribers ${clause} ORDER BY id_subscriber LIMIT 50000`, params);
  const header = ['email', 'nombre', 'estado', 'fuente', 'consentimiento_en', 'baja_en', 'consentimiento_texto'];
  const csv = '\uFEFF' + [header.map(csvCell).join(','), ...rows.map(row => header.map(key => csvCell(row[key])).join(','))].join('\r\n') + '\r\n';
  res.set('Cache-Control', 'no-store');
  res.set('Content-Disposition', 'attachment; filename="comunidad-miembros.csv"');
  return res.type('text/csv; charset=utf-8').send(csv);
};

exports.upsertSubscriber = upsertSubscriber;
