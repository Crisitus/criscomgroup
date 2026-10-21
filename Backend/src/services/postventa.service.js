const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { sequelize } = require("../config/database");
const { Pedido, PedidoDetalle } = require("../models");
const { getMailMode, smtpConfigured, createTransport, oneLine } = require("./mail.service");

const ESTADOS = ["recibida", "en_revision", "esperando_cliente", "aprobada", "rechazada", "resuelta"];
const TIPOS = ["cambio", "devolucion", "garantia"];
const ACCIONES = ["ninguna", "reingreso_stock", "nota_credito", "reembolso", "otra"];
// Estados desde los que se puede pasar a cada estado. rechazada y resuelta son terminales.
const TRANSICIONES = {
  recibida: ["en_revision", "rechazada"],
  en_revision: ["esperando_cliente", "aprobada", "rechazada"],
  esperando_cliente: ["en_revision", "rechazada"],
  aprobada: ["resuelta"],
  rechazada: [],
  resuelta: [],
};
const REAPERTURA = { rechazada: "en_revision", resuelta: "en_revision" };
const REQUIEREN_RESPUESTA = ["aprobada", "rechazada", "resuelta"];
const PLAZO_DIAS = 7;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const dentroDeAlfabeto = new RegExp(`^POS-\\d{8}-[${ALFABETO}]{10}$`);

// MySQL entrega la hora de pared de Lima sin zona; en sqlite (tests) es UTC.
const lima = sequelize.getDialect() !== "sqlite";
const iso = (value) => {
  if (!value) return null;
  const date = new Date(typeof value === "string" && !/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? `${value.replace(" ", "T")}Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = lima ? date : new Date(date.getTime() - 5 * 3600 * 1000);
  return shifted.toISOString().replace("Z", "-05:00");
};

const fechaLima = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date).replaceAll("-", "");

const codigoNuevo = () => {
  let sufijo = "";
  for (const byte of crypto.randomBytes(10)) sufijo += ALFABETO[byte % ALFABETO.length];
  return `POS-${fechaLima()}-${sufijo}`;
};

const norm = (value) => String(value || "").trim().toLowerCase();
const ultimos4 = (value) => String(value || "").replace(/\D/g, "").slice(-4);

const sumarMeses = (date, meses) => {
  const out = new Date(date.getTime());
  out.setUTCMonth(out.getUTCMonth() + meses);
  return out;
};

// Busca el pedido real por numero y compara el correo. No rechaza: solo marca.
async function vincularPedido({ numero_pedido, email, producto_servicio, tipo }) {
  const vacio = { pedido_id: null, venta_id: null, vinculado: false, fuera_de_plazo: null };
  const pedido = await Pedido.findOne({ where: { numero_pedido: String(numero_pedido).trim().toUpperCase() } })
    || await Pedido.findOne({ where: { numero_pedido: String(numero_pedido).trim() } });
  if (!pedido || norm(pedido.cliente_email) !== norm(email)) return vacio;
  const out = { pedido_id: pedido.id_pedido, venta_id: pedido.venta_id || null, vinculado: true, fuera_de_plazo: null };
  if (pedido.estado !== "entregado") return out;
  const entrega = new Date(typeof pedido.fecha_actualizacion === "string"
    ? `${pedido.fecha_actualizacion.replace(" ", "T")}Z` : pedido.fecha_actualizacion);
  if (Number.isNaN(entrega.getTime())) return out;
  const limite = tipo === "garantia" ? await limiteGarantia(pedido, entrega, producto_servicio)
    : new Date(entrega.getTime() + PLAZO_DIAS * 86400000);
  if (limite) out.fuera_de_plazo = Date.now() > limite.getTime();
  return out;
}

async function limiteGarantia(pedido, entrega, producto) {
  const detalles = await PedidoDetalle.findAll({ where: { id_pedido: pedido.id_pedido } });
  if (!detalles.length) return null;
  const buscado = norm(producto);
  const detalle = detalles.find((d) => norm(d.producto_nombre) === buscado)
    || detalles.find((d) => buscado && (norm(d.producto_nombre).includes(buscado) || buscado.includes(norm(d.producto_nombre))))
    || detalles[0];
  return sumarMeses(entrega, Number(detalle.garantia_meses) || 0);
}

// Correo al cliente. Nunca rompe el flujo; en dry/test queda en jsonTransport.
async function enviarCorreo(to, subject, text) {
  try {
    const mode = getMailMode();
    if (mode === "live" && !smtpConfigured()) return;
    await createTransport(mode).sendMail({
      from: process.env.MAIL_FROM || "CRISCOM <postventa@localhost.invalid>", to, subject: oneLine(subject).slice(0, 200), text,
    });
  } catch (error) {
    console.error("[postventa.mail]", error.message);
  }
}

const trackLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 20, standardHeaders: "draft-7", legacyHeaders: false,
  message: { success: false, message: "Demasiadas consultas. Espera unos minutos antes de intentarlo nuevamente." },
  skip: () => process.env.NODE_ENV === "test",
});

module.exports = {
  ESTADOS, TIPOS, ACCIONES, TRANSICIONES, REAPERTURA, REQUIEREN_RESPUESTA, PLAZO_DIAS, dentroDeAlfabeto,
  iso, codigoNuevo, norm, ultimos4, vincularPedido, enviarCorreo, trackLimiter,
};
