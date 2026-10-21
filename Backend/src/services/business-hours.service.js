// Horario laboral de la empresa. Zona horaria fija: America/Lima.
// Aplica SOLO a vendedores fisicos (rol 3, tipo_vendedor = 'fisico'). Gerentes (1),
// administradores (2), auditores (5), afiliados y vendedores online nunca se bloquean.
const TIMEZONE = 'America/Lima';
const DEFAULTS = { horario_inicio: '08:50', horario_fin: '21:15' };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BLOCKS = 'Solo vendedores fisicos (rol 3, tipo_vendedor "fisico"). Gerentes, administradores, auditores, afiliados y vendedores online no se bloquean.';

const toMinutes = value => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const nowInLima = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === 'hour').value) % 24;
  const minute = Number(parts.find(p => p.type === 'minute').value);
  return { hour, minute, minutes: hour * 60 + minute, label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
};

// Evalua si "ahora" cae dentro del horario. inicio == fin es una configuracion invalida:
// nunca bloquea a todos (se trata como restriccion apagada y se marca valida=false).
const evaluate = (company, date = new Date()) => {
  const inicio = TIME_RE.test(company?.horario_inicio || '') ? company.horario_inicio : DEFAULTS.horario_inicio;
  const fin = TIME_RE.test(company?.horario_fin || '') ? company.horario_fin : DEFAULTS.horario_fin;
  const activa = company ? company.horario_restriccion_activa !== false && company.horario_restriccion_activa !== 0 : true;
  const now = nowInLima(date);
  const start = toMinutes(inicio);
  const end = toMinutes(fin);
  const valida = start !== end;
  if (!activa || !valida) return { horario_inicio: inicio, horario_fin: fin, restriccion_activa: activa, valida, dentro: true, ahora_lima: now.label };
  const dentro = start < end ? now.minutes >= start && now.minutes < end : now.minutes >= start || now.minutes < end;
  return { horario_inicio: inicio, horario_fin: fin, restriccion_activa: activa, valida, dentro, ahora_lima: now.label };
};

const parseBoolean = value => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
};

module.exports = { TIMEZONE, DEFAULTS, TIME_RE, BLOCKS, toMinutes, nowInLima, evaluate, parseBoolean };
