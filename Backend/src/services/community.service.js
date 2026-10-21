const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const mail = require('./mail.service');

const cleanEmail = value => String(value || '').trim().toLowerCase();
const cleanText = (value, max) => String(value || '').trim().slice(0, max);
const token = () => crypto.randomBytes(32).toString('hex');
const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const DEFAULT_CONSENT = 'Acepto recibir comunicaciones de CRISCOM';

async function upsertSubscriber({ email, nombre, fuente, userId, consentText, ip }) {
  const normalized = cleanEmail(email);
  const consent = cleanText(consentText, 300) || DEFAULT_CONSENT;
  const ipText = cleanText(ip, 64) || null;
  const existing = (await select('SELECT id_subscriber FROM community_subscribers WHERE email = ? LIMIT 1', [normalized]))[0];
  if (existing) {
    await sequelize.query(`UPDATE community_subscribers SET nombre = COALESCE(NULLIF(?, ''), nombre), estado='activo', fuente=?, consentimiento_en=NOW(), baja_en=NULL, user_id=COALESCE(?, user_id), consentimiento_texto=?, consentimiento_ip=? WHERE id_subscriber=?`, { replacements: [cleanText(nombre, 150), cleanText(fuente, 50), userId || null, consent, ipText, existing.id_subscriber] });
    return existing.id_subscriber;
  }
  const [id] = await sequelize.query('INSERT INTO community_subscribers (email,nombre,fuente,unsubscribe_token,user_id,consentimiento_texto,consentimiento_ip) VALUES (?,?,?,?,?,?,?)', { replacements: [normalized, cleanText(nombre, 150) || null, cleanText(fuente, 50), token(), userId || null, consent, ipText] });
  return id;
}

async function progress(campaignId) {
  const [row] = await select("SELECT SUM(estado='enviado') AS enviados, SUM(estado='fallido') AS fallidos FROM community_deliveries WHERE campaign_id=?", [campaignId]);
  return { enviados: Number(row?.enviados || 0), fallidos: Number(row?.fallidos || 0) };
}

const pendingSql = `FROM community_subscribers s WHERE s.estado='activo' AND NOT EXISTS (SELECT 1 FROM community_deliveries d WHERE d.campaign_id=? AND d.subscriber_id=s.id_subscriber)`;
async function countPending(campaignId) {
  return Number((await select(`SELECT COUNT(*) AS total ${pendingSql}`, [campaignId]))[0].total);
}

function finalStatus({ enviados, fallidos }) {
  if (enviados && !fallidos) return 'enviado';
  if (enviados) return 'parcial';
  return fallidos ? 'fallido' : 'borrador';
}

// Cuerpo del envio: lotes pequenos, una fila de entrega por destinatario, contadores progresivos.
async function runCampaign(campaign, mode) {
  const batchSize = Math.max(1, Number(process.env.COMMUNITY_BATCH_SIZE || 20));
  const delay = Number(process.env.COMMUNITY_BATCH_DELAY_MS ?? (mode === 'live' ? 1000 : 0));
  const transporter = mail.createTransport(mode);
  for (;;) {
    const batch = await select(`SELECT s.id_subscriber, s.email, s.nombre, s.unsubscribe_token ${pendingSql} ORDER BY s.id_subscriber LIMIT ${batchSize}`, [campaign.id_campaign]);
    if (!batch.length) break;
    for (const member of batch) {
      let state = 'enviado', error = null;
      try { await transporter.sendMail(mail.buildMessage(campaign, member)); }
      catch (err) { state = 'fallido'; error = cleanText(err.message, 500); console.error('[community] Fallo de envio a suscriptor', member.id_subscriber, error); }
      await sequelize.query('INSERT INTO community_deliveries (campaign_id,subscriber_id,estado,error) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE estado=VALUES(estado), error=VALUES(error), enviado_en=NOW()', { replacements: [campaign.id_campaign, member.id_subscriber, state, error] });
    }
    const p = await progress(campaign.id_campaign);
    await sequelize.query('UPDATE community_campaigns SET enviados=?, fallidos=? WHERE id_campaign=?', { replacements: [p.enviados, p.fallidos, campaign.id_campaign] });
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  }
  const p = await progress(campaign.id_campaign);
  const status = finalStatus(p);
  const note = status === 'fallido' ? 'Todos los envios fallaron' : status === 'parcial' ? `${p.fallidos} envios fallaron; reintenta para completar` : null;
  await sequelize.query('UPDATE community_campaigns SET estado=?, enviados=?, fallidos=?, enviado_en=NOW(), error=? WHERE id_campaign=?', { replacements: [status, p.enviados, p.fallidos, note, campaign.id_campaign] });
}

// Reclama la campania de forma atomica y lanza el envio en segundo plano.
// Devuelve { status, body } listo para responder.
async function startCampaign(id) {
  const mode = mail.getMailMode();
  const blocker = mail.sendBlocker(mode);
  if (blocker) return { status: blocker.status, body: { message: blocker.message, modo: mode } };
  const [claim] = await sequelize.query("UPDATE community_campaigns SET estado='enviando', modo_envio=?, iniciado_en=NOW(), error=NULL WHERE id_campaign=? AND estado IN ('borrador','fallido','parcial')", { replacements: [mode, id] });
  if (!claim.affectedRows) {
    const exists = (await select('SELECT estado FROM community_campaigns WHERE id_campaign=?', [id]))[0];
    return exists ? { status: 409, body: { message: `La campaña ya está en estado "${exists.estado}" y no se puede enviar` } } : { status: 404, body: { message: 'Campaña no encontrada' } };
  }
  const campaign = (await select('SELECT * FROM community_campaigns WHERE id_campaign=?', [id]))[0];
  await sequelize.query("DELETE FROM community_deliveries WHERE campaign_id=? AND estado='fallido'", { replacements: [id] });
  const pending = await countPending(id);
  const done = await progress(id);
  if (!pending) {
    const status = finalStatus(done);
    await sequelize.query('UPDATE community_campaigns SET estado=? WHERE id_campaign=?', { replacements: [status, id] });
    return { status: 409, body: { message: status === 'enviado' ? 'Todos los miembros activos ya recibieron esta campaña' : 'No hay miembros activos con consentimiento' } };
  }
  await sequelize.query('UPDATE community_campaigns SET destinatarios=?, enviados=?, fallidos=0 WHERE id_campaign=?', { replacements: [pending + done.enviados, done.enviados, id] });
  runCampaign(campaign, mode).catch(async error => {
    console.error('[community] Error al enviar campaña', id, error.message);
    const p = await progress(id).catch(() => ({ enviados: 0, fallidos: 0 }));
    await sequelize.query("UPDATE community_campaigns SET estado=?, enviados=?, fallidos=?, error=? WHERE id_campaign=?", { replacements: [p.enviados ? 'parcial' : 'fallido', p.enviados, p.fallidos, cleanText(error.message, 500), id] }).catch(() => {});
  });
  return { status: 202, body: { success: true, message: 'Envío iniciado', id_campaign: id, destinatarios: pending + done.enviados, pendientes: pending, modo: mode } };
}

async function recoverStuckCampaigns() {
  const [result] = await sequelize.query("UPDATE community_campaigns SET estado='parcial', error='Envío interrumpido por reinicio del servidor; reintenta para completar' WHERE estado='enviando'");
  return result.affectedRows || 0;
}

module.exports = { cleanEmail, cleanText, upsertSubscriber, progress, startCampaign, recoverStuckCampaigns, countPending, select, finalStatus };
