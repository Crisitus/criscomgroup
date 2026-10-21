const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const { SolicitudEnsamble, SolicitudEnsambleHistorial: Historial, Cotizacion, CotizacionDetalle, Producto } = require("../models");
const S = require("../services/solicitud.service");
const W = require("../services/solicitudWorkflow.service");
const A = require("../services/solicitudArmado.service");
const mail = require("../services/solicitudMail.service");

const ESTADOS = ["recibida", "en_revision", "cotizada", "aprobada", "en_ensamble", "entregada", "rechazada"];
// Estados desde los que se puede pasar a cada estado. entregada y rechazada son terminales.
const TRANSICIONES = {
  recibida: ["en_revision", "cotizada", "rechazada"],
  en_revision: ["cotizada", "rechazada"],
  cotizada: ["en_revision", "aprobada", "rechazada"],
  aprobada: ["en_ensamble", "rechazada"],
  en_ensamble: ["entregada"],
  entregada: [],
  rechazada: [],
};
const COTIZABLES = ["recibida", "en_revision", "cotizada"];
const MODOS = ["marketplace", "presupuesto", "ensamble_propio"];
const TIERS = ["oficina", "gamer", "alto_rendimiento", "workstation", "otro"];
const PERIFERICOS = ["solo_pc", "con_perifericos"];
const PRIORIDADES = ["grafica", "procesador", "placa", "estetica", "refrigeracion", "almacenamiento", "silencio", "portabilidad"];
const MONEDA = "PEN";
const VISIBLES_CON_MONTO = ["cotizada", "aprobada", "en_ensamble", "entregada"];
const cfg = { estados: ESTADOS, transiciones: TRANSICIONES, cotizables: COTIZABLES, Historial };

const safe = (fn, label, msg = "Error interno. Intenta de nuevo.") => S.safe(fn, label, msg);

// Vista del cliente: sin nombre, ciudad, teléfono, stock ni notas internas.
async function vistaPublica(item) {
  const p = item.toJSON();
  const conMonto = VISIBLES_CON_MONTO.includes(p.estado) && p.cotizacion_monto !== null;
  const lineas = A.lineasPublicas(p.productos);
  const eventos = await Historial.findAll({ where: { solicitud_id: p.id_solicitud, accion: "estado" }, order: [["id_historial", "ASC"]] });
  return {
    id_solicitud: p.id_solicitud,
    codigo_seguimiento: p.codigo_seguimiento,
    modo: p.modo,
    productos: p.modo === "marketplace" ? lineas : null,
    total_referencial: p.modo === "marketplace" ? A.totales(p.productos).total_catalogo : null,
    tier_presupuesto: p.tier_presupuesto,
    presupuesto_personalizado: S.num(p.presupuesto_personalizado),
    uso_descripcion: p.uso_descripcion,
    incluye_perifericos: p.incluye_perifericos,
    marcas_preferencia: p.marcas_preferencia,
    prioridades: p.prioridades,
    estado: p.estado,
    moneda: MONEDA,
    igv_incluido: true,
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

function vistaAdminCon(item, lineasDe) {
  const p = item.toJSON();
  const totales = p.modo === "marketplace" ? A.totales(p.productos) : null;
  return {
    ...p,
    productos: p.modo === "marketplace" ? lineasDe(p.productos) : p.productos,
    resumen_catalogo: totales,
    presupuesto_personalizado: S.num(p.presupuesto_personalizado),
    cotizacion_monto: S.num(p.cotizacion_monto),
    moneda: MONEDA,
    igv_incluido: true,
    cotizacion_fecha: S.iso(p.cotizacion_fecha),
    valida_hasta: S.iso(p.valida_hasta),
    vencida: p.estado === "cotizada" ? S.vencida(p.valida_hasta) : false,
    convertida_en: S.iso(p.convertida_en),
    whatsapp_url: S.waUrl(p.telefono_solicitante, `Hola ${p.nombre_solicitante}, te escribimos de CRISCOM por tu solicitud de armado ${p.codigo_seguimiento}.`),
    created_at: S.iso(p.createdAt),
    updated_at: S.iso(p.updatedAt),
    createdAt: S.iso(p.createdAt),
    updatedAt: S.iso(p.updatedAt),
  };
}
const vistaAdmin = async (items) => {
  const lineasDe = await A.enriquecer(items.map((i) => ({ productos: i.productos })));
  return items.map((i) => vistaAdminCon(i, lineasDe));
};

const vistaHistorial = (h) => ({
  id_historial: h.id_historial, usuario_id: h.usuario_id, accion: h.accion, de: h.de, a: h.a,
  monto_anterior: S.num(h.monto_anterior), monto_nuevo: S.num(h.monto_nuevo), nota: h.nota, creado: S.iso(h.creado),
});

// ---------------------------------------------------------------------------
// Validación de la entrada pública
// ---------------------------------------------------------------------------
async function validarCreacion(b) {
  const e = {};
  const d = {};
  const nombre = S.str(b.nombre_solicitante);
  if (nombre.length < 3 || nombre.length > 120) e.nombre_solicitante = "El nombre debe tener entre 3 y 120 caracteres.";
  d.nombre_solicitante = nombre;
  const tel = S.str(b.telefono_solicitante);
  if (!tel || !S.telefonoValido(tel)) e.telefono_solicitante = "Ingresa un teléfono válido (7 a 15 dígitos).";
  d.telefono_solicitante = tel;
  const email = S.str(b.email_solicitante).toLowerCase();
  if (email && (!S.EMAIL_RE.test(email) || email.length > 160)) e.email_solicitante = "Ingresa un correo válido.";
  d.email_solicitante = email || null;
  const ciudad = S.str(b.ciudad);
  if (ciudad.length < 2 || ciudad.length > 120) e.ciudad = "La ciudad debe tener entre 2 y 120 caracteres.";
  d.ciudad = ciudad;
  const mensaje = S.str(b.mensaje);
  if (mensaje.length > 4000) e.mensaje = "El mensaje admite como máximo 4000 caracteres.";
  d.mensaje = mensaje || null;
  if (!MODOS.includes(b.modo)) { e.modo = `Modo inválido. Elige: ${MODOS.join(", ")}.`; return { errores: e, datos: d }; }
  d.modo = b.modo;
  d.productos = d.tier_presupuesto = d.presupuesto_personalizado = d.uso_descripcion = d.incluye_perifericos = null;
  d.marcas_preferencia = d.prioridades = null;

  if (b.modo === "marketplace") {
    const r = await A.resolverLineas(b.productos);
    if (r.error) e.productos = r.error; else d.productos = r.lineas;
  } else if (b.modo === "ensamble_propio") {
    if (mensaje.length < 10) e.mensaje = "Cuéntanos qué piezas tienes (mínimo 10 caracteres).";
  } else {
    if (!TIERS.includes(b.tier_presupuesto)) e.tier_presupuesto = `Nivel de presupuesto inválido. Elige: ${TIERS.join(", ")}.`;
    d.tier_presupuesto = b.tier_presupuesto;
    const vacio = b.presupuesto_personalizado === undefined || b.presupuesto_personalizado === null || b.presupuesto_personalizado === "";
    if (b.tier_presupuesto === "otro") {
      const n = Number(b.presupuesto_personalizado);
      if (vacio || !Number.isFinite(n) || n <= 0 || n > 99999999) e.presupuesto_personalizado = "Indica un monto en soles mayor que 0.";
      else d.presupuesto_personalizado = n;
    } else if (!vacio) e.presupuesto_personalizado = "El presupuesto personalizado solo se usa con el nivel «otro».";
    const uso = S.str(b.uso_descripcion);
    if (uso.length > 2000) e.uso_descripcion = "Máximo 2000 caracteres.";
    d.uso_descripcion = uso || null;
    if (b.incluye_perifericos && !PERIFERICOS.includes(b.incluye_perifericos)) e.incluye_perifericos = `Elige: ${PERIFERICOS.join(", ")}.`;
    d.incluye_perifericos = b.incluye_perifericos || "solo_pc";
    const marcas = S.str(b.marcas_preferencia);
    if (marcas.length > 255) e.marcas_preferencia = "Máximo 255 caracteres.";
    d.marcas_preferencia = marcas || null;
    if (b.prioridades !== undefined && b.prioridades !== null) {
      if (!Array.isArray(b.prioridades)) e.prioridades = "Las prioridades deben ser una lista.";
      else if (b.prioridades.some((x) => !PRIORIDADES.includes(x))) e.prioridades = `Prioridad inválida. Válidas: ${PRIORIDADES.join(", ")}.`;
      else if (new Set(b.prioridades).size > 2) e.prioridades = "Puedes marcar como máximo 2 prioridades.";
      else d.prioridades = [...new Set(b.prioridades)];
    }
  }
  return { errores: e, datos: d };
}

const firma = (d) => [d.modo, d.modo === "marketplace" ? (d.productos || []).map((l) => `${l.id_producto}x${l.cantidad}`).sort().join(",")
  : d.tier_presupuesto || S.norm(d.mensaje).slice(0, 60)].join("|");

exports.create = safe(async (req, res) => {
  const b = req.body || {};
  // Honeypot: un bot rellena 'website'. Se responde como éxito sin guardar nada.
  if (S.str(b.website)) return res.status(201).json({ success: true, msg: "Solicitud registrada.", message: "Solicitud registrada.", data: { codigo_seguimiento: null } });
  const { errores, datos } = await validarCreacion(b);
  if (Object.keys(errores).length) return S.fail(res, 400, "Revisa los campos marcados.", errores);

  const recientes = await SolicitudEnsamble.findAll({
    where: { telefono_solicitante: datos.telefono_solicitante, modo: datos.modo, createdAt: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (recientes.some((r) => firma(r.toJSON()) === firma(datos))) {
    return S.fail(res, 409, "Ya registraste una solicitud igual en las últimas 24 horas. Consulta su avance con tu código de seguimiento.");
  }
  let item = null;
  for (let intento = 0; intento < 5 && !item; intento += 1) {
    try {
      item = await SolicitudEnsamble.create({ ...datos, codigo_seguimiento: S.codigoNuevo("ARM"), estado: "recibida" });
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError") throw error;
    }
  }
  if (!item) return S.fail(res, 500, "No pudimos generar un código de seguimiento. Intenta nuevamente.");
  await Historial.create({ solicitud_id: item.id_solicitud, usuario_id: null, accion: "estado", de: null, a: "recibida", nota: "Solicitud registrada por el cliente" });
  await item.reload();
  mail.recibidaArmado(item);
  return res.status(201).json({
    success: true, msg: "Solicitud de armado registrada. Guarda tu código de seguimiento.", message: "Solicitud de armado registrada. Guarda tu código de seguimiento.",
    data: await vistaPublica(item),
  });
}, "ensamble.create", "No pudimos registrar la solicitud. Intenta nuevamente.");

// ---------------------------------------------------------------------------
// Seguimiento público: código + segundo factor (correo o 4 últimos dígitos del teléfono)
// ---------------------------------------------------------------------------
const NO_ENCONTRADA = "No encontramos una solicitud con esos datos. Revisa el código y el correo o teléfono.";
async function buscarSeguimiento(codigo, email, tel4) {
  const cod = S.str(codigo).toUpperCase();
  if (!S.codigoValido("ARM", cod)) return null;
  const item = await SolicitudEnsamble.findOne({ where: { codigo_seguimiento: cod } });
  if (!item) return null;
  const okMail = email && item.email_solicitante && S.norm(email) === S.norm(item.email_solicitante);
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
exports.getBySeguimiento = safe((req, res) => responderSeguimiento(res, req.params.codigo, req.query.email, req.query.tel4), "ensamble.seguimiento", msgSeg);
exports.trackPost = safe((req, res) => {
  const b = req.body || {};
  return responderSeguimiento(res, b.codigo, b.email, b.telefono4 ?? b.tel4);
}, "ensamble.seguimientoPost", msgSeg);

// ---------------------------------------------------------------------------
// Admin (cuenta maestra)
// ---------------------------------------------------------------------------
const filtroBusqueda = (q) => {
  const texto = S.str(q.q);
  if (!texto) return {};
  const like = `%${texto.replace(/[%_\\]/g, "")}%`;
  const campos = ["codigo_seguimiento", "nombre_solicitante", "email_solicitante", "telefono_solicitante", "ciudad"];
  return { [Op.or]: campos.map((c) => ({ [c]: { [Op.like]: like } })) };
};

// GET /api/solicitudes-ensamble?estado&q&modo&page&limit
exports.listAdmin = safe(async (req, res) => {
  const { limit, page, offset } = S.paginar(req.query);
  const base = filtroBusqueda(req.query);
  const where = { ...base };
  if (req.query.estado) {
    if (!ESTADOS.includes(req.query.estado)) return S.fail(res, 400, "Estado inválido.", { estado: `Debe ser uno de: ${ESTADOS.join(", ")}.` });
    where.estado = req.query.estado;
  }
  if (MODOS.includes(req.query.modo)) where.modo = req.query.modo;
  const { rows, count } = await SolicitudEnsamble.findAndCountAll({
    where, order: [["createdAt", "DESC"], ["id_solicitud", "DESC"]], limit, offset,
  });
  const resumen = await W.resumenPorEstado(SolicitudEnsamble, ESTADOS, base);
  const lista = await vistaAdmin(rows);
  return res.json({ success: true, rows: lista, data: lista, total: count, page, limit, resumen });
}, "ensamble.listAdmin", "Error al obtener las solicitudes.");

const detalle = async (item) => {
  const [vista] = await vistaAdmin([item]);
  const historial = await Historial.findAll({ where: { solicitud_id: item.id_solicitud }, order: [["creado", "DESC"], ["id_historial", "DESC"]] });
  return { ...vista, historial: historial.map(vistaHistorial), transiciones: TRANSICIONES[item.estado] };
};

// GET /api/solicitudes-ensamble/:id — detalle con historial
exports.getAdmin = safe(async (req, res) => {
  const item = await SolicitudEnsamble.findByPk(req.params.id);
  if (!item) return S.fail(res, 404, "Solicitud no encontrada.");
  return res.json({ success: true, data: await detalle(item) });
}, "ensamble.getAdmin", "Error al obtener la solicitud.");

// PUT /api/solicitudes-ensamble/:id/estado
exports.updateEstadoAdmin = safe(async (req, res) => {
  const item = await SolicitudEnsamble.findByPk(req.params.id);
  if (!item) return S.fail(res, 404, "Solicitud no encontrada.");
  const r = await W.actualizar(item, req.body, cfg, req.user && (req.user.id_user || req.user.id));
  if (r.status !== 200) return S.fail(res, r.status, r.message, r.errores);
  if (r.flags.cotizadaAhora) mail.cotizada(item, { moneda: MONEDA, actualizada: r.flags.actualizada });
  return res.json({ success: true, message: r.flags.sinCambios ? "Sin cambios." : "Solicitud actualizada.", data: await detalle(item) });
}, "ensamble.updateEstadoAdmin", "Error al actualizar la solicitud.");

const nextNumber = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

// POST /api/solicitudes-ensamble/:id/convertir — crea una cotización profesional en borrador.
// Solo modo marketplace (tiene líneas de catálogo). No mueve dinero ni stock.
// Pendiente: presupuesto y ensamble_propio no tienen líneas; se arman a mano en Cotizaciones.
exports.convertir = safe(async (req, res) => {
  const usuario = req.user && (req.user.id_user || req.user.id);
  const t = await sequelize.transaction();
  try {
    const item = await SolicitudEnsamble.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!item) { await t.rollback(); return S.fail(res, 404, "Solicitud no encontrada."); }
    if (item.cotizacion_id) {
      const existente = await Cotizacion.findByPk(item.cotizacion_id, { include: [{ model: CotizacionDetalle, as: "detalles" }], transaction: t });
      await t.commit();
      return res.status(200).json({ success: true, ya_convertida: true, message: "La solicitud ya había sido convertida.", cotizacion_id: item.cotizacion_id, data: existente });
    }
    if (!["cotizada", "aprobada"].includes(item.estado)) {
      await t.rollback();
      return S.fail(res, 409, `Solo se convierten solicitudes cotizadas o aprobadas (estado actual: «${item.estado}»).`);
    }
    if (item.modo !== "marketplace" || !Array.isArray(item.productos) || !item.productos.length) {
      await t.rollback();
      return S.fail(res, 409, "Solo las solicitudes con productos del catálogo se convierten en cotización. Para este modo, arma la cotización a mano en Cotizaciones.");
    }
    const monto = S.num(item.cotizacion_monto);
    if (!(monto > 0)) { await t.rollback(); return S.fail(res, 409, "La solicitud no tiene un monto cotizado."); }
    const productos = await Producto.scope("allBusinesses").findAll({ where: { id_producto: item.productos.map((l) => l.id_producto) }, transaction: t });
    const porId = new Map(productos.map((p) => [p.id_producto, p]));
    const faltante = item.productos.find((l) => !porId.has(Number(l.id_producto)));
    if (faltante) { await t.rollback(); return S.fail(res, 409, `El producto «${faltante.nombre}» ya no existe en el catálogo.`); }

    const lineas = item.productos.map((l) => {
      const p = porId.get(Number(l.id_producto));
      const precio = A.precioVigente(p);
      return { producto_id: p.id_producto, descripcion: p.nombre, cantidad: l.cantidad, precio_unitario: precio, costo_unitario: S.round2(p.costo_promedio || 0), subtotal: S.round2(l.cantidad * precio) };
    });
    let subtotal = S.round2(lineas.reduce((s, l) => s + l.subtotal, 0));
    let descuento = 0;
    // La cotización formal refleja el monto acordado con el cliente.
    if (monto > subtotal) {
      const extra = S.round2(monto - subtotal);
      lineas.push({ producto_id: null, descripcion: "Servicio de armado y configuración", cantidad: 1, precio_unitario: extra, costo_unitario: 0, subtotal: extra });
      subtotal = S.round2(subtotal + extra);
    } else if (monto < subtotal) descuento = S.round2(subtotal - monto);
    const costo = S.round2(lineas.reduce((s, l) => s + l.cantidad * l.costo_unitario, 0));
    const cot = await Cotizacion.create({
      numero: nextNumber("COT"), cliente_nombre: item.nombre_solicitante, cliente_email: item.email_solicitante,
      cliente_telefono: item.telefono_solicitante, escenario: "personalizada", vigencia_dias: S.VIGENCIA_DIAS,
      subtotal, descuento, total: monto, costo_total: costo, margen: S.round2(monto / (1 + S.IGV) - costo), estado: "borrador",
      notas: `Origen: solicitud web ${item.codigo_seguimiento}.`, creado_por: usuario, affiliate_business_id: null,
    }, { transaction: t });
    await CotizacionDetalle.bulkCreate(lineas.map((l) => ({ ...l, cotizacion_id: cot.id_cotizacion })), { transaction: t });
    await item.update({ cotizacion_id: cot.id_cotizacion, convertida_en: new Date() }, { transaction: t });
    await Historial.create({ solicitud_id: item.id_solicitud, usuario_id: usuario || null, accion: "convertir", de: item.estado, a: item.estado, nota: `Cotización ${cot.numero}` }, { transaction: t });
    await t.commit();
    return res.status(201).json({ success: true, ya_convertida: false, message: "Cotización creada en borrador.", cotizacion_id: cot.id_cotizacion, numero: cot.numero });
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}, "ensamble.convertir", "No se pudo convertir la solicitud.");
