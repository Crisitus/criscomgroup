const nodemailer = require('nodemailer');

const MODES = ['dry', 'test', 'live'];
const REQUIRED_SMTP = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const oneLine = value => String(value || '').replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
const personalize = (template, nombre) => String(template || '').split('{{nombre}}').join(nombre);

const smtpConfigured = () => REQUIRED_SMTP.every(key => Boolean(process.env[key]));
const publicBaseUrl = () => String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

// dry (por defecto) y test usan jsonTransport: nada sale de la maquina.
// live solo es el valor por defecto en produccion con SMTP completo.
function getMailMode() {
  const explicit = String(process.env.MAIL_MODE || '').trim().toLowerCase();
  if (MODES.includes(explicit)) return explicit;
  return process.env.NODE_ENV === 'production' && smtpConfigured() ? 'live' : 'dry';
}

// Devuelve un objeto de error HTTP si el modo actual no puede enviar.
function sendBlocker(mode = getMailMode()) {
  if (!publicBaseUrl()) return { status: 503, message: 'Configura PUBLIC_BASE_URL antes de enviar: los correos necesitan el enlace de baja' };
  if (mode === 'live' && !smtpConfigured()) return { status: 503, message: 'Configura SMTP_HOST, SMTP_USER, SMTP_PASSWORD y MAIL_FROM antes de enviar en modo live' };
  return null;
}

function createTransport(mode = getMailMode()) {
  if (mode !== 'live') return nodemailer.createTransport({ jsonTransport: true });
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

function unsubscribeUrl(token) {
  return `${publicBaseUrl()}/api/community/unsubscribe/${token}`;
}

function buildMessage(campaign, member, { subjectPrefix = '' } = {}) {
  const nombre = oneLine(member.nombre) || 'miembro de CRISCOM';
  const url = unsubscribeUrl(member.unsubscribe_token);
  const body = personalize(campaign.contenido, nombre);
  const subject = oneLine(subjectPrefix + personalize(campaign.asunto, nombre)).slice(0, 200);
  const footer = 'Recibes este correo porque aceptaste unirte a la comunidad CRISCOM.';
  const html = `<div style="font-family:Arial;line-height:1.6;max-width:680px;margin:auto"><div>${escapeHtml(body).replace(/\r?\n/g, '<br>')}</div><hr><p style="font-size:12px;color:#64748b">${footer} <a href="${escapeHtml(url)}">Dejar de recibir correos</a></p></div>`;
  const text = `${body}\n\n--\n${footer}\nDejar de recibir correos: ${url}\n`;
  return {
    from: process.env.MAIL_FROM || 'CRISCOM <comunidad@localhost.invalid>',
    to: member.email,
    subject,
    text,
    html,
    headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

module.exports = { getMailMode, smtpConfigured, publicBaseUrl, sendBlocker, createTransport, buildMessage, oneLine, MODES };
