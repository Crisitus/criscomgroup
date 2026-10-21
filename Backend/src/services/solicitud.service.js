const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { sequelize } = require("../config/database");
const { getMailMode, smtpConfigured, createTransport, oneLine, publicBaseUrl } = require("./mail.service");

// Utilidades comunes a las solicitudes de importación y de armado.
const IGV = 0.18;
const VIGENCIA_DIAS = 7;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

const codigoNuevo = (prefijo) => {
  let sufijo = "";
  for (const byte of crypto.randomBytes(10)) sufijo += ALFABETO[byte % ALFABETO.length];
  return `${prefijo}-${fechaLima()}-${sufijo}`;
};
// Acepta también los códigos antiguos de 6 caracteres.
const codigoValido = (prefijo, codigo) => new RegExp(`^${prefijo}-\\d{8}-[A-Z0-9]{6,10}$`).test(String(codigo || ""));

const str = (v) => (typeof v === "string" ? v.trim() : "");
const norm = (v) => String(v || "").trim().toLowerCase();
const digitos = (v) => String(v || "").replace(/\D/g, "");
const ultimos4 = (v) => digitos(v).slice(-4);
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

const telefonoValido = (v) => /^\+?[\d\s().-]{7,25}$/.test(v) && digitos(v).length >= 7 && digitos(v).length <= 15;
const urlHttp = (v) => {
  if (typeof v !== "string" || v.length > 500) return false;
  try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; }
};
const fechaCivil = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())
  && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;

const sumarDias = (dias, desde = new Date()) => new Date(desde.getTime() + dias * 86400000);
// Instante real de un valor leído de la BD (en MySQL llega como hora de pared de Lima).
const instante = (value) => {
  if (!value) return null;
  const date = new Date(typeof value === "string" && !/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? `${value.replace(" ", "T")}Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  return typeof value === "string" && lima ? new Date(date.getTime() + 5 * 3600 * 1000) : date;
};
const vencida = (validaHasta) => {
  const fin = instante(validaHasta);
  return Boolean(fin) && fin.getTime() < Date.now();
};

// Enlace wa.me con texto precargado (el contacto lo hace una persona; no se envía nada solo).
const waUrl = (telefono, texto) => {
  let d = digitos(telefono);
  if (d.length < 7) return null;
  if (d.length === 9) d = `51${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
};

const fail = (res, status, message, errores) =>
  res.status(status).json(errores
    ? { success: false, message, msg: message, errores }
    : { success: false, message, msg: message });
const safe = (fn, label, msg) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    // Un dato demasiado largo o fuera de rango no es un fallo del servidor.
    if (["SequelizeValidationError", "SequelizeUniqueConstraintError"].includes(error.name)
      || (error.name === "SequelizeDatabaseError" && /ER_DATA_TOO_LONG|ER_WARN_DATA_OUT_OF_RANGE|ER_TRUNCATED_WRONG_VALUE|Data too long|out of range/i.test(`${error.original?.code} ${error.message}`))) {
      if (!res.headersSent) return fail(res, 400, "Revisa los datos enviados: alguno no es válido o es demasiado largo.");
    }
    console.error(`[solicitudes.${label}]`, error);
    if (!res.headersSent) fail(res, 500, msg);
  }
};

// Paginación segura: valores inválidos vuelven al defecto.
const paginar = (q, defecto = 20, tope = 100) => {
  const limit = Math.min(tope, Math.max(1, parseInt(q.limit, 10) || defecto));
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const offset = Number.isInteger(parseInt(q.offset, 10)) && parseInt(q.offset, 10) >= 0 && !q.page
    ? parseInt(q.offset, 10) : (page - 1) * limit;
  return { limit, page: q.page ? page : Math.floor(offset / limit) + 1, offset };
};

const trackLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 20, standardHeaders: "draft-7", legacyHeaders: false,
  message: { success: false, message: "Demasiadas consultas. Espera unos minutos antes de intentarlo nuevamente." },
  skip: () => process.env.NODE_ENV === "test",
});

module.exports = {
  IGV, VIGENCIA_DIAS, EMAIL_RE, iso, fechaLima, codigoNuevo, codigoValido, str, norm, digitos, ultimos4, round2, num,
  telefonoValido, waUrl, urlHttp, fechaCivil, sumarDias, vencida, fail, safe, paginar, trackLimiter,
  getMailMode, smtpConfigured, createTransport, oneLine, publicBaseUrl,
};
