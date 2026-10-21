'use strict';
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { LibroReclamaciones } = require('../models');
const feriados = require('./feriados-peru');
const mail = require('./mail.service');

const PLAZO_DIAS_HABILES = 15;
const POR_VENCER_DIAS = 3;
const ESTADOS = LibroReclamaciones.ESTADOS;
const ABIERTOS = ['pendiente', 'en_proceso'];
// Estado actual -> estados a los que se puede pasar.
const TRANSICIONES = {
  pendiente: ['en_proceso', 'respondido', 'archivado'],
  en_proceso: ['respondido', 'archivado'],
  respondido: ['archivado'],
  archivado: [],
};
const LIMITES = { nombre: 160, email: 190, telefono: 30, domicilio: 255, apoderado: 160, bien: 255, detalle: 4000, pedido: 1000, respuesta: 4000 };

// --- Fechas (hora Lima) -------------------------------------------------
// En MySQL la conexion usa dateStrings: el valor leido es la hora de pared de Lima
// que Date interpreta como UTC, por eso su ISO sin 'Z' ya es la hora de Lima (ver blog.controller).
const lima = sequelize.getDialect() !== 'sqlite';
const iso = value => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = lima ? date : new Date(date.getTime() - 5 * 3600 * 1000);
  return shifted.toISOString().replace('Z', '-05:00');
};
const hoyLima = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const fechaLimaDe = value => (iso(value) || '').slice(0, 10) || null;
const calcularVencimiento = (desde = hoyLima()) => feriados.sumarDiasHabiles(desde, PLAZO_DIAS_HABILES);

// --- Validacion -----------------------------------------------------------
const texto = (v, multilinea = false) => {
  if (typeof v !== 'string') return null;
  if (!multilinea) return v.replace(/\s+/g, ' ').trim();
  return v.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
};
const EMAIL_RE = /^[^\s@,;<>()\[\]\\\"]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
const DOC_RE = /^(\d{8}|\d{11}|[A-Za-z0-9]{9})$/;

function validar(body = {}) {
  const errores = {};
  const d = {};
  const requerido = (campo, etiqueta, min, max, valor = body[campo]) => {
    if (valor === undefined || valor === null || valor === '') { errores[campo] = `${etiqueta} es obligatorio.`; return null; }
    const t = texto(valor, ['detalle', 'pedido', 'respuesta'].includes(campo));
    if (t === null) { errores[campo] = `${etiqueta} debe ser texto.`; return null; }
    if (t.length < min) { errores[campo] = `${etiqueta} debe tener al menos ${min} caracteres.`; return null; }
    if (t.length > max) { errores[campo] = `${etiqueta} no puede superar ${max} caracteres.`; return null; }
    return t;
  };
  d.nombre = requerido('nombre', 'El nombre', 3, LIMITES.nombre);
  d.email = requerido('email', 'El correo', 5, LIMITES.email);
  if (d.email) { d.email = d.email.toLowerCase(); if (!EMAIL_RE.test(d.email)) errores.email = 'Ingresa un correo v\u00e1lido.'; }
  if (body.telefono !== undefined && body.telefono !== null && body.telefono !== '') {
    const t = texto(body.telefono);
    if (t === null || t.length > LIMITES.telefono || !/^[0-9+()\- ]{6,30}$/.test(t)) errores.telefono = 'Ingresa un tel\u00e9fono v\u00e1lido (6 a 30 d\u00edgitos).';
    else d.telefono = t;
  } else d.telefono = null;
  const doc = requerido('documento', 'El documento', 8, 20);
  if (doc) { const limpio = doc.replace(/[\s-]/g, ''); if (!DOC_RE.test(limpio)) errores.documento = 'Documento inv\u00e1lido: DNI de 8 d\u00edgitos, CE de 9 o RUC de 11.'; else d.documento = limpio.toUpperCase(); }
  d.domicilio = requerido('domicilio', 'El domicilio', 5, LIMITES.domicilio);
  if (body.es_menor !== undefined && body.es_menor !== null && typeof body.es_menor !== 'boolean') errores.es_menor = 'Indica si el consumidor es menor de edad (verdadero o falso).';
  d.es_menor = body.es_menor === true;
  if (d.es_menor) d.apoderado = requerido('apoderado', 'El padre, madre o apoderado', 3, LIMITES.apoderado);
  else d.apoderado = null;
  if (!['producto', 'servicio'].includes(body.tipo_bien)) errores.tipo_bien = 'Elige producto o servicio.'; else d.tipo_bien = body.tipo_bien;
  d.bien = requerido('bien', 'El bien contratado', 3, LIMITES.bien);
  if (body.monto === undefined || body.monto === null || body.monto === '') d.monto = null;
  else {
    const n = typeof body.monto === 'number' ? body.monto : (typeof body.monto === 'string' && body.monto.trim() !== '' ? Number(body.monto) : NaN);
    if (!Number.isFinite(n) || n < 0 || n > 99999999.99) errores.monto = 'El monto debe ser un n\u00famero mayor o igual a 0.';
    else d.monto = Math.round(n * 100) / 100;
  }
  if (!['reclamo', 'queja'].includes(body.tipo)) errores.tipo = 'Elige reclamo o queja.'; else d.tipo = body.tipo;
  const detalle = body.detalle ?? body.mensaje ?? body.descripcion;
  d.descripcion = requerido('detalle', 'El detalle', 20, LIMITES.detalle, detalle);
  d.pedido = requerido('pedido', 'El pedido del consumidor', 5, LIMITES.pedido);
  if (body.acepta_declaracion !== true) errores.acepta_declaracion = 'Debes aceptar la declaraci\u00f3n para registrar la hoja.';
  return { errores, datos: d };
}


// --- Salida -----------------------------------------------------------------
const plano = row => (typeof row.toJSON === 'function' ? row.toJSON() : { ...row });
const abierto = estado => ABIERTOS.includes(estado);

function plazo(estado, vencimiento, hoy = hoyLima()) {
  if (!abierto(estado) || !vencimiento) return { dias_restantes: null, vencido: false, por_vencer: false };
  const vencido = hoy > vencimiento;
  const base = feriados.diasHabilesRestantes(hoy, vencimiento);
  const dias = vencido ? Math.min(-1, base) : base;
  return { dias_restantes: dias, vencido, por_vencer: !vencido && dias <= POR_VENCER_DIAS };
}

// completo=false (listado) omite documento, domicilio, apoderado, pedido y el detalle completo.
function aSalida(row, { completo = true, hoy = hoyLima() } = {}) {
  const r = plano(row);
  const venc = r.fecha_vencimiento ? String(r.fecha_vencimiento).slice(0, 10) : null;
  const out = {
    id_reclamo: r.id_reclamo, codigo: r.codigo, tipo: r.tipo, estado: r.estado,
    nombre: r.nombre, email: r.email, tipo_bien: r.tipo_bien, bien: r.bien,
    monto: r.monto === null || r.monto === undefined ? null : Number(r.monto),
    fecha: iso(r.fecha), fecha_vencimiento: venc, fecha_respuesta: iso(r.fecha_respuesta),
    ...plazo(r.estado, venc, hoy),
    respondido_en_plazo: r.estado === 'respondido' && venc && r.fecha_respuesta ? fechaLimaDe(r.fecha_respuesta) <= venc : null,
  };
  if (completo) {
    Object.assign(out, {
      telefono: r.telefono, documento: r.documento, domicilio: r.domicilio, es_menor: !!r.es_menor,
      apoderado: r.apoderado, pedido: r.pedido, descripcion: r.descripcion,
      respuesta: r.respuesta, respondido_por: r.respondido_por,
    });
  } else {
    out.extracto = String(r.descripcion || '').slice(0, 160);
  }
  return out;
}

// --- Alta con codigo correlativo por anio (hora Lima) ----------------------
const esDuplicado = e => e && (e.name === 'SequelizeUniqueConstraintError' || e.parent?.code === 'ER_DUP_ENTRY');
const esDeadlock = e => e && (e.parent?.code === 'ER_LOCK_DEADLOCK' || e.parent?.errno === 1213);

async function crear(datos, { ahora = new Date() } = {}) {
  const hoy = hoyLima(ahora);
  const prefijo = `LR-${hoy.slice(0, 4)}-`;
  for (let intento = 0; intento < 6; intento += 1) {
    try {
      const creada = await sequelize.transaction(async transaction => {
        const ultimo = await LibroReclamaciones.findOne({
          where: { codigo: { [Op.like]: `${prefijo}%` } }, order: [['codigo', 'DESC']],
          attributes: ['codigo'], transaction, lock: transaction.LOCK.UPDATE,
        });
        const siguiente = ultimo ? Number(ultimo.codigo.slice(prefijo.length)) + 1 : 1;
        return LibroReclamaciones.create({
          ...datos, codigo: `${prefijo}${String(siguiente).padStart(6, '0')}`, estado: 'pendiente',
          fecha: ahora, fecha_vencimiento: calcularVencimiento(hoy),
        }, { transaction });
      });
      // Relee de la BD: asi `fecha` sale con el mismo formato (hora Lima) que en el listado.
      return await creada.reload();
    } catch (error) {
      if (!(esDuplicado(error) || esDeadlock(error)) || intento === 5) throw error;
    }
  }
  return null;
}

// Mismo correo y mismo detalle en las ultimas 24 horas.
async function existeDuplicado(email, descripcion, ahora = new Date()) {
  const desde = new Date(ahora.getTime() - 24 * 3600 * 1000);
  const found = await LibroReclamaciones.findOne({ where: { email, descripcion, fecha: { [Op.gte]: desde } }, attributes: ['id_reclamo'] });
  return Boolean(found);
}

// --- Listado, resumen y export ------------------------------------------------
const escLike = v => v.replace(/[\\%_]/g, c => `\\${c}`);
const verdadero = v => ['1', 'true', 'si', 'yes'].includes(String(v || '').toLowerCase());

function filtros(query = {}, hoy = hoyLima()) {
  const errores = {};
  const where = {};
  const and = [];
  if (query.estado) { if (ESTADOS.includes(query.estado)) where.estado = query.estado; else errores.estado = `Estado inválido. Usa: ${ESTADOS.join(', ')}.`; }
  if (query.tipo) { if (['reclamo', 'queja'].includes(query.tipo)) where.tipo = query.tipo; else errores.tipo = 'Tipo inválido. Usa reclamo o queja.'; }
  if (verdadero(query.vencido)) {
    and.push({ estado: { [Op.in]: ABIERTOS } }, { fecha_vencimiento: { [Op.lt]: hoy } });
  }
  const q = texto(typeof query.q === 'string' ? query.q : '');
  if (q) {
    const like = { [Op.like]: `%${escLike(q.slice(0, 100))}%` };
    and.push({ [Op.or]: [{ codigo: like }, { nombre: like }, { documento: like }, { email: like }] });
  }
  if (and.length) where[Op.and] = and;
  return { where, errores };
}

async function listar(query = {}) {
  const hoy = hoyLima();
  const { where, errores } = filtros(query, hoy);
  if (Object.keys(errores).length) return { errores };
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const { rows, count } = await LibroReclamaciones.findAndCountAll({
    where, order: [['fecha', 'DESC'], ['id_reclamo', 'DESC']], limit, offset: (page - 1) * limit,
  });
  return { rows: rows.map(r => aSalida(r, { completo: false, hoy })), total: count, page, limit, resumen: await resumen(hoy) };
}

async function resumen(hoy = hoyLima()) {
  const por_estado = Object.fromEntries(ESTADOS.map(e => [e, 0]));
  const grupos = await LibroReclamaciones.findAll({ attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id_reclamo')), 'n']], group: ['estado'], raw: true });
  for (const g of grupos) if (g.estado in por_estado) por_estado[g.estado] = Number(g.n);
  const abiertos = await LibroReclamaciones.findAll({
    attributes: ['fecha_vencimiento', [sequelize.fn('COUNT', sequelize.col('id_reclamo')), 'n']],
    where: { estado: { [Op.in]: ABIERTOS } }, group: ['fecha_vencimiento'], raw: true,
  });
  let vencidos = 0; let por_vencer = 0;
  for (const g of abiertos) {
    const p = plazo('pendiente', g.fecha_vencimiento ? String(g.fecha_vencimiento).slice(0, 10) : null, hoy);
    if (p.vencido) vencidos += Number(g.n); else if (p.por_vencer) por_vencer += Number(g.n);
  }
  return { total: Object.values(por_estado).reduce((a, b) => a + b, 0), por_estado, vencidos, por_vencer };
}

const CSV_COLUMNAS = ['codigo', 'fecha', 'tipo', 'estado', 'nombre', 'documento', 'email', 'telefono', 'domicilio', 'es_menor', 'apoderado', 'tipo_bien', 'bien', 'monto', 'descripcion', 'pedido', 'fecha_vencimiento', 'dias_restantes', 'vencido', 'fecha_respuesta', 'respuesta'];
// Neutraliza formulas (=, +, -, @) para que Excel no ejecute contenido ingresado por el publico.
const celda = v => {
  if (v === null || v === undefined) return '';
  let t = typeof v === 'boolean' ? (v ? 'si' : 'no') : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

async function exportarCsv(query = {}) {
  const hoy = hoyLima();
  const { where, errores } = filtros(query, hoy);
  if (Object.keys(errores).length) return { errores };
  const filas = await LibroReclamaciones.findAll({ where, order: [['fecha', 'DESC'], ['id_reclamo', 'DESC']], limit: 10000 });
  const lineas = [CSV_COLUMNAS.join(',')];
  for (const f of filas) {
    const o = aSalida(f, { completo: true, hoy });
    lineas.push(CSV_COLUMNAS.map(c => celda(o[c])).join(','));
  }
  return { csv: `\uFEFF${lineas.join('\r\n')}\r\n`, total: filas.length };
}

// --- Cambios del ERP (PUT): solo estado y respuesta ------------------------------
function validarCambio(actual, body = {}) {
  const errores = {};
  const tieneEstado = body.estado !== undefined && body.estado !== null && body.estado !== '';
  const tieneRespuesta = body.respuesta !== undefined && body.respuesta !== null && body.respuesta !== '';
  if (!tieneEstado && !tieneRespuesta) return { status: 400, message: 'Indica el estado y, si respondes, la respuesta.', errores: { estado: 'Indica el nuevo estado.' } };
  if (tieneEstado && !ESTADOS.includes(body.estado)) return { status: 400, message: 'Estado inválido.', errores: { estado: `Usa: ${ESTADOS.join(', ')}.` } };
  const nuevo = tieneEstado ? body.estado : null;
  let respuesta = null;
  if (tieneRespuesta) {
    respuesta = typeof body.respuesta === 'string' ? texto(body.respuesta, true) : null;
    if (respuesta === null || respuesta.length < 20 || respuesta.length > LIMITES.respuesta) errores.respuesta = `La respuesta debe tener entre 20 y ${LIMITES.respuesta} caracteres.`;
    if (nuevo !== 'respondido') errores.respuesta = 'La respuesta solo se registra junto con el estado "respondido".';
  } else if (nuevo === 'respondido') errores.respuesta = 'Para marcar como respondido escribe la respuesta al consumidor.';
  if (Object.keys(errores).length) return { status: 400, message: 'Revisa los datos de la respuesta.', errores };
  if (nuevo === actual.estado) return { status: 409, message: `La hoja ya está en estado "${actual.estado}".` };
  if (!TRANSICIONES[actual.estado].includes(nuevo)) {
    const permitidas = TRANSICIONES[actual.estado];
    return { status: 409, message: `No se puede pasar de "${actual.estado}" a "${nuevo}".${permitidas.length ? ` Permitido: ${permitidas.join(', ')}.` : ' La hoja archivada es definitiva.'}` };
  }
  return { cambios: { estado: nuevo, ...(nuevo === 'respondido' ? { respuesta } : {}) } };
}

// --- Correos (copia al consumidor y respuesta) ---------------------------------
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const remitente = () => process.env.MAIL_FROM || 'CRISCOM <reclamos@localhost.invalid>';
const fechaCorta = d => (d ? d.split('-').reverse().join('/') : '-');

function mensajeCopia(r) {
  const venc = fechaCorta(String(r.fecha_vencimiento).slice(0, 10));
  const lineas = [
    `Hola ${mail.oneLine(r.nombre)},`, '',
    `Registramos tu ${r.tipo} en el Libro de Reclamaciones de CRISCOM con el código ${r.codigo}.`,
    `Responderemos a este correo a más tardar el ${venc} (15 días hábiles).`, '',
    `Bien contratado: ${r.tipo_bien} - ${r.bien}`, ...(r.monto !== null && r.monto !== undefined ? [`Monto reclamado: S/ ${Number(r.monto).toFixed(2)}`] : []),
    '', 'Detalle:', r.descripcion, '', 'Pedido del consumidor:', r.pedido, '',
    'Conserva este código como constancia. Este canal no limita otras vías de solución de controversias.',
  ];
  const text = lineas.join('\n');
  return { from: remitente(), to: r.email, subject: `Hoja de reclamación ${r.codigo} registrada`, text, html: `<div style="font-family:Arial;line-height:1.6;max-width:640px">${esc(text).replace(/\n/g, '<br>')}</div>` };
}

function mensajeRespuesta(r) {
  const text = [`Hola ${mail.oneLine(r.nombre)},`, '', `Respuesta a tu ${r.tipo} ${r.codigo}:`, '', r.respuesta, '', 'Atentamente,', 'Atención al cliente - CRISCOM'].join('\n');
  return { from: remitente(), to: r.email, subject: `Respuesta a tu hoja de reclamación ${r.codigo}`, text, html: `<div style="font-family:Arial;line-height:1.6;max-width:640px">${esc(text).replace(/\n/g, '<br>')}</div>` };
}

// Nunca interrumpe el flujo: devuelve 'enviado' | 'omitido' | 'error'.
async function enviarCorreo(message) {
  const modo = mail.getMailMode();
  if (modo === 'live' && !mail.smtpConfigured()) { console.warn('[libro-reclamaciones] SMTP incompleto: correo omitido', message.subject); return 'omitido'; }
  try {
    const info = await mail.createTransport(modo).sendMail(message);
    if (modo !== 'live') console.info(`[libro-reclamaciones] correo (${modo}) a ${message.to}: ${message.subject}\n${message.text}`);
    return info ? 'enviado' : 'omitido';
  } catch (error) {
    console.error('[libro-reclamaciones] fallo de envio:', error.message);
    return 'error';
  }
}

module.exports = {
  PLAZO_DIAS_HABILES, POR_VENCER_DIAS, ESTADOS, ABIERTOS, TRANSICIONES, LIMITES,
  iso, hoyLima, fechaLimaDe, calcularVencimiento, validar, texto, plazo, aSalida, abierto, crear, existeDuplicado,
  enviarCorreo, mensajeCopia, mensajeRespuesta,
  listar, resumen, exportarCsv, validarCambio, CSV_COLUMNAS, LibroReclamaciones,
};
