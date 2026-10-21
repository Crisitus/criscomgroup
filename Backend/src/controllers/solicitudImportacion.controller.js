const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const { SolicitudImportacion, SolicitudImportacionHistorial: Historial, Importacion } = require("../models");
const S = require("../services/solicitud.service");
const W = require("../services/solicitudWorkflow.service");
const mail = require("../services/solicitudMail.service");

const ESTADOS = ["recibida", "en_revision", "cotizada", "aprobada", "en_transito", "entregada", "rechazada"];
// Estados desde los que se puede pasar a cada estado. entregada y rechazada son terminales.
const TRANSICIONES = {
  recibida: ["en_revision", "cotizada", "rechazada"],
  en_revision: ["cotizada", "rechazada"],
  cotizada: ["en_revision", "aprobada", "rechazada"],
  aprobada: ["en_transito", "rechazada"],
  en_transito: ["entregada"],
  entregada: [],
  rechazada: [],
};
const COTIZABLES = ["recibida", "en_revision", "cotizada"];
const TIPOS = ["laptop", "componente", "periferico", "monitor", "almacenamiento", "red", "otro"];
const URGENCIAS = ["baja", "media", "alta", "urgente"];
const MONEDA = "USD";
const VISIBLES_CON_MONTO = ["cotizada", "aprobada", "en_transito", "entregada"];
const cfg = { estados: ESTADOS, transiciones: TRANSICIONES, cotizables: COTIZABLES, Historial };

const safe = (fn, label, msg = "Error interno. Intenta de nuevo.") => S.safe(fn, label, msg);
const nota = (raw) => S.str(raw) || null;

// Vista que ve el cliente en el seguimiento. Sin notas internas, nombre ni datos de contacto.
async function vistaPublica(item) {
  const p = item.toJSON();
  const conMonto = VISIBLES_CON_MONTO.includes(p.estado) && p.cotizacion_monto !== null;
  const eventos = await Historial.findAll({ where: { solicitud_id: p.id_solicitud, accion: "estado" }, order: [["id_historial", "ASC"]] });
  return {
    id_solicitud: p.id_solicitud,
    codigo_seguimiento: p.codigo_seguimiento,
    nombre_producto: p.nombre_producto,
    tipo_producto: p.tipo_producto,
    marca: p.marca,
    modelo: p.modelo,
    cantidad: p.cantidad,
    nivel_urgencia: p.nivel_urgencia,
    estado: p.estado,
    moneda: MONEDA,
    cotizacion_monto: conMonto ? S.num(p.cotizacion_monto) : null,
    cotizacion_nota: conMonto || p.estado === "rechazada" ? p.cotizacion_nota : null,
    cotizacion_fecha: conMonto ? S.iso(p.cotizacion_fecha) : null,
    valida_hasta: conMonto ? S.iso(p.valida_hasta) : null,
    vencida: conMonto && p.estado === "cotizada" ? S.vencida(p.valida_hasta) : false,
    fecha_entrega_estimada: p.fecha_entrega_estimada || null,
    created_at: S.iso(p.createdAt),
    updated_at: S.iso(p.updatedAt),
    linea_tiempo: eventos.map((h) => ({ estado: h.a, fecha: S.iso(h.creado) })),
  };
}

const vistaAdmin = (item) => {
  const p = item.toJSON();
  return {
    ...p,
    presupuesto_min: S.num(p.presupuesto_min),
    presupuesto_max: S.num(p.presupuesto_max),
    cotizacion_monto: S.num(p.cotizacion_monto),
    moneda: MONEDA,
    cotizacion_fecha: S.iso(p.cotizacion_fecha),
    valida_hasta: S.iso(p.valida_hasta),
    vencida: p.estado === "cotizada" ? S.vencida(p.valida_hasta) : false,
    convertida_en: S.iso(p.convertida_en),
    whatsapp_url: S.waUrl(p.telefono_solicitante, `Hola ${p.nombre_solicitante}, te escribimos de CRISCOM por tu solicitud de importación ${p.codigo_seguimiento}.`),
    created_at: S.iso(p.createdAt),
    updated_at: S.iso(p.updatedAt),
    createdAt: S.iso(p.createdAt),
    updatedAt: S.iso(p.updatedAt),
  };
};

const vistaHistorial = (h) => ({
  id_historial: h.id_historial, usuario_id: h.usuario_id, accion: h.accion, de: h.de, a: h.a,
  monto_anterior: S.num(h.monto_anterior), monto_nuevo: S.num(h.monto_nuevo), nota: h.nota, creado: S.iso(h.creado),
});

// ---------------------------------------------------------------------------
// Validación de la entrada pública
// ---------------------------------------------------------------------------
function validarCreacion(b) {
  const e = {};
  const d = {};
  const largo = (campo, valor, min, max, etiqueta) => {
    if (valor.length < min || valor.length > max) e[campo] = `${etiqueta} debe tener entre ${min} y ${max} caracteres.`;
    return valor;
  };
  d.nombre_solicitante = largo("nombre_solicitante", S.str(b.nombre_solicitante), 3, 120, "El nombre");
  d.email_solicitante = S.str(b.email_solicitante).toLowerCase();
  if (!S.EMAIL_RE.test(d.email_solicitante) || d.email_solicitante.length > 160) e.email_solicitante = "Ingresa un correo válido.";
  d.telefono_solicitante = S.str(b.telefono_solicitante) || null;
  if (d.telefono_solicitante && !S.telefonoValido(d.telefono_solicitante)) e.telefono_solicitante = "Ingresa un teléfono válido (7 a 15 dígitos).";
  d.nombre_producto = largo("nombre_producto", S.str(b.nombre_producto), 3, 200, "El producto");
  if (!TIPOS.includes(b.tipo_producto)) e.tipo_producto = `Tipo de producto inválido. Elige: ${TIPOS.join(", ")}.`;
  d.tipo_producto = b.tipo_producto;
  for (const [campo, max, et] of [["marca", 80, "La marca"], ["modelo", 120, "El modelo"], ["pais_origen", 80, "El país de origen"]]) {
    const v = S.str(b[campo]);
    if (v.length > max) e[campo] = `${et} admite como máximo ${max} caracteres.`;
    d[campo] = v || null;
  }
  for (const [campo, max, et] of [["especificaciones", 4000, "Las especificaciones"], ["mensaje", 4000, "El mensaje"]]) {
    const v = S.str(b[campo]);
    if (v.length > max) e[campo] = `${et} admite como máximo ${max} caracteres.`;
    d[campo] = v || null;
  }
  const cantidad = b.cantidad === undefined || b.cantidad === "" || b.cantidad === null ? 1 : Number(b.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) e.cantidad = "La cantidad debe ser un entero entre 1 y 999.";
  d.cantidad = cantidad;
  for (const campo of ["presupuesto_min", "presupuesto_max"]) {
    const v = b[campo];
    if (v === undefined || v === null || v === "") { d[campo] = null; continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 99999999) e[campo] = "El presupuesto debe ser un número entre 0 y 99,999,999.";
    d[campo] = Number.isFinite(n) ? n : null;
  }
  if (d.presupuesto_min !== null && d.presupuesto_max !== null && d.presupuesto_min > d.presupuesto_max && !e.presupuesto_min) {
    e.presupuesto_min = "El presupuesto mínimo no puede superar al máximo.";
  }
  if (b.nivel_urgencia && !URGENCIAS.includes(b.nivel_urgencia)) e.nivel_urgencia = `Urgencia inválida. Elige: ${URGENCIAS.join(", ")}.`;
  d.nivel_urgencia = b.nivel_urgencia || "media";
  if (b.imagenes_urls !== undefined && b.imagenes_urls !== null) {
    if (!Array.isArray(b.imagenes_urls) || b.imagenes_urls.length > 5 || !b.imagenes_urls.every(S.urlHttp)) {
      e.imagenes_urls = "Envía hasta 5 enlaces http o https (máximo 500 caracteres cada uno).";
    } else d.imagenes_urls = b.imagenes_urls.length ? b.imagenes_urls : null;
  }
  return { errores: e, datos: d };
}

// ---------------------------------------------------------------------------
// POST /api/ecommerce/solicitudes-importacion — público
// ---------------------------------------------------------------------------
exports.create = safe(async (req, res) => {
  const b = req.body || {};
  // Honeypot: un bot rellena 'website'. Se responde como éxito sin guardar nada.
  if (S.str(b.website)) return res.status(201).json({ success: true, msg: "Solicitud registrada.", message: "Solicitud registrada.", data: { codigo_seguimiento: null } });
  const { errores, datos } = validarCreacion(b);
  if (Object.keys(errores).length) return S.fail(res, 400, "Revisa los campos marcados.", errores);

  const duplicada = await SolicitudImportacion.findOne({
    where: {
      email_solicitante: datos.email_solicitante, nombre_producto: datos.nombre_producto, tipo_producto: datos.tipo_producto,
      createdAt: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) },
    },
  });
  if (duplicada) return S.fail(res, 409, "Ya registraste una solicitud igual en las últimas 24 horas. Consulta su avance con tu código de seguimiento.");

  let item = null;
  for (let intento = 0; intento < 5 && !item; intento += 1) {
    try {
      item = await SolicitudImportacion.create({ ...datos, codigo_seguimiento: S.codigoNuevo("SOL"), estado: "recibida" });
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError") throw error;
    }
  }
  if (!item) return S.fail(res, 500, "No pudimos generar un código de seguimiento. Intenta nuevamente.");
  await Historial.create({ solicitud_id: item.id_solicitud, usuario_id: null, accion: "estado", de: null, a: "recibida", nota: "Solicitud registrada por el cliente" });
  await item.reload();
  mail.recibidaImportacion(item);
  return res.status(201).json({
    success: true, msg: "Solicitud registrada. Guarda tu código de seguimiento.", message: "Solicitud registrada. Guarda tu código de seguimiento.",
    data: await vistaPublica(item),
  });
}, "importacion.create", "No pudimos registrar la solicitud. Intenta nuevamente.");

// ---------------------------------------------------------------------------
// Seguimiento público: código + segundo factor (correo o 4 últimos dígitos del teléfono)
// ---------------------------------------------------------------------------
const NO_ENCONTRADA = "No encontramos una solicitud con esos datos. Revisa el código y el correo o teléfono.";
async function buscarSeguimiento(codigo, email, tel4) {
  const cod = S.str(codigo).toUpperCase();
  if (!S.codigoValido("SOL", cod)) return null;
  const item = await SolicitudImportacion.findOne({ where: { codigo_seguimiento: cod } });
  if (!item) return null;
  const okMail = email && S.norm(email) === S.norm(item.email_solicitante);
  const okTel = tel4 && /^\d{4}$/.test(String(tel4).trim()) && S.ultimos4(item.telefono_solicitante) === String(tel4).trim();
  return okMail || okTel ? item : null;
}
async function responderSeguimiento(res, codigo, email, tel4) {
  if (!S.str(email) && !S.str(tel4)) return S.fail(res, 400, "Indica el correo con el que registraste la solicitud o los 4 últimos dígitos de tu teléfono.");
  const item = await buscarSeguimiento(codigo, S.str(email), S.str(tel4));
  if (!item) return S.fail(res, 404, NO_ENCONTRADA);
  return res.json({ success: true, data: await vistaPublica(item) });
}
const msgSeg = "No pudimos consultar la solicitud. Intenta nuevamente.";
exports.getBySeguimiento = safe((req, res) => responderSeguimiento(res, req.params.codigo, req.query.email, req.query.tel4), "importacion.seguimiento", msgSeg);
exports.trackPost = safe((req, res) => {
  const b = req.body || {};
  return responderSeguimiento(res, b.codigo, b.email, b.telefono4 ?? b.tel4);
}, "importacion.seguimientoPost", msgSeg);

// ---------------------------------------------------------------------------
// Admin (cuenta maestra)
// ---------------------------------------------------------------------------
const filtroBusqueda = (q) => {
  const texto = S.str(q.q);
  if (!texto) return {};
  const like = `%${texto.replace(/[%_\\]/g, "")}%`;
  const campos = ["codigo_seguimiento", "nombre_solicitante", "email_solicitante", "telefono_solicitante", "nombre_producto", "marca", "modelo"];
  return { [Op.or]: campos.map((c) => ({ [c]: { [Op.like]: like } })) };
};

// GET /api/solicitudes-importacion?estado&q&tipo&urgencia&page&limit
exports.listAdmin = safe(async (req, res) => {
  const { limit, page, offset } = S.paginar(req.query);
  const base = filtroBusqueda(req.query);
  const where = { ...base };
  if (req.query.estado) {
    if (!ESTADOS.includes(req.query.estado)) return S.fail(res, 400, "Estado inválido.", { estado: `Debe ser uno de: ${ESTADOS.join(", ")}.` });
    where.estado = req.query.estado;
  }
  if (TIPOS.includes(req.query.tipo)) where.tipo_producto = req.query.tipo;
  if (URGENCIAS.includes(req.query.urgencia)) where.nivel_urgencia = req.query.urgencia;
  const { rows, count } = await SolicitudImportacion.findAndCountAll({
    where, order: [["createdAt", "DESC"], ["id_solicitud", "DESC"]], limit, offset,
  });
  const resumen = await W.resumenPorEstado(SolicitudImportacion, ESTADOS, base);
  const lista = rows.map(vistaAdmin);
  return res.json({ success: true, rows: lista, data: lista, total: count, page, limit, resumen });
}, "importacion.listAdmin", "Error al obtener las solicitudes.");

// GET /api/solicitudes-importacion/:id — detalle con historial
exports.getAdmin = safe(async (req, res) => {
  const item = await SolicitudImportacion.findByPk(req.params.id);
  if (!item) return S.fail(res, 404, "Solicitud no encontrada.");
  const historial = await Historial.findAll({ where: { solicitud_id: item.id_solicitud }, order: [["creado", "DESC"], ["id_historial", "DESC"]] });
  return res.json({ success: true, data: { ...vistaAdmin(item), historial: historial.map(vistaHistorial), transiciones: TRANSICIONES[item.estado] } });
}, "importacion.getAdmin", "Error al obtener la solicitud.");

// PUT /api/solicitudes-importacion/:id/estado
exports.updateEstadoAdmin = safe(async (req, res) => {
  const item = await SolicitudImportacion.findByPk(req.params.id);
  if (!item) return S.fail(res, 404, "Solicitud no encontrada.");
  const r = await W.actualizar(item, req.body, cfg, req.user && (req.user.id_user || req.user.id));
  if (r.status !== 200) return S.fail(res, r.status, r.message, r.errores);
  if (r.flags.cotizadaAhora) mail.cotizada(item, { moneda: MONEDA, actualizada: r.flags.actualizada });
  const historial = await Historial.findAll({ where: { solicitud_id: item.id_solicitud }, order: [["creado", "DESC"], ["id_historial", "DESC"]] });
  return res.json({
    success: true, message: r.flags.sinCambios ? "Sin cambios." : "Solicitud actualizada.",
    data: { ...vistaAdmin(item), historial: historial.map(vistaHistorial), transiciones: TRANSICIONES[item.estado] },
  });
}, "importacion.updateEstadoAdmin", "Error al actualizar la solicitud.");

// POST /api/solicitudes-importacion/:id/convertir — crea una Importación planificada.
// No mueve dinero ni stock: el monto cotizado al cliente NO es el costo de compra,
// por eso costo_mercancia queda en 0 y el monto va como referencia en notas_contables.
exports.convertir = safe(async (req, res) => {
  const usuario = req.user && (req.user.id_user || req.user.id);
  const t = await sequelize.transaction();
  try {
    const item = await SolicitudImportacion.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!item) { await t.rollback(); return S.fail(res, 404, "Solicitud no encontrada."); }
    if (item.importacion_id) {
      const existente = await Importacion.findByPk(item.importacion_id, { transaction: t });
      await t.commit();
      return res.status(200).json({ success: true, ya_convertida: true, message: "La solicitud ya había sido convertida.", importacion_id: item.importacion_id, data: existente });
    }
    if (!["cotizada", "aprobada"].includes(item.estado)) {
      await t.rollback();
      return S.fail(res, 409, `Solo se convierten solicitudes cotizadas o aprobadas (estado actual: «${item.estado}»).`);
    }
    if (await Importacion.findOne({ where: { referencia: item.codigo_seguimiento }, transaction: t })) {
      await t.rollback();
      return S.fail(res, 409, "Ya existe una importación con la referencia de esta solicitud.");
    }
    const detalle = [item.nombre_producto, item.marca, item.modelo].filter(Boolean).join(" ");
    const importacion = await Importacion.create({
      producto_id: null,
      cantidad: item.cantidad,
      referencia: item.codigo_seguimiento,
      proveedor: "Por definir",
      pais_origen: item.pais_origen || "Por definir",
      descripcion: `${detalle} (x${item.cantidad}). Origen: solicitud web ${item.codigo_seguimiento}.${item.especificaciones ? ` Especificaciones: ${item.especificaciones}` : ""}`,
      moneda: MONEDA,
      costo_mercancia: 0,
      estado: "planificada",
      fecha_llegada_estimada: item.fecha_entrega_estimada || null,
      notas_contables: `Convertida desde la solicitud ${item.codigo_seguimiento}. Cotizado al cliente: US$ ${Number(item.cotizacion_monto || 0).toFixed(2)} (referencia de venta, no es costo de compra). Completa proveedor y costos reales.`,
      creado_por: usuario,
    }, { transaction: t });
    await item.update({ importacion_id: importacion.id_importacion, convertida_en: new Date() }, { transaction: t });
    await Historial.create({ solicitud_id: item.id_solicitud, usuario_id: usuario || null, accion: "convertir", de: item.estado, a: item.estado, nota: `Importación #${importacion.id_importacion}` }, { transaction: t });
    await t.commit();
    return res.status(201).json({ success: true, ya_convertida: false, message: "Importación creada en estado planificada.", importacion_id: importacion.id_importacion, data: importacion });
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}, "importacion.convertir", "No se pudo convertir la solicitud.");
