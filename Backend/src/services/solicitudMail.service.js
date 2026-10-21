const { getMailMode, smtpConfigured, createTransport, oneLine, publicBaseUrl, iso } = require("./solicitud.service");

// Correos al cliente. Nunca rompen el flujo; en dry/test quedan en jsonTransport (nada sale).
async function enviarCorreo(to, subject, text) {
  try {
    if (!to) return false;
    const mode = getMailMode();
    if (mode === "live" && !smtpConfigured()) return false;
    await createTransport(mode).sendMail({
      from: process.env.MAIL_FROM || "CRISCOM <solicitudes@localhost.invalid>",
      to, subject: oneLine(subject).slice(0, 200), text,
    });
    return true;
  } catch (error) {
    console.error("[solicitudes.mail]", error.message);
    return false;
  }
}

const enlace = (codigo) => (publicBaseUrl() ? `\nSigue tu solicitud: ${publicBaseUrl()}/seguimiento-solicitud/${codigo}\n` : "\n");
const fechaLegible = (valor) => {
  const f = iso(valor);
  return f ? f.slice(0, 10).split("-").reverse().join("/") : null;
};
const dinero = (moneda, monto) => `${moneda === "USD" ? "US$" : "S/"} ${Number(monto).toFixed(2)}`;
const FACTOR = "Para consultar el avance necesitarás este código y tu correo o los 4 últimos dígitos de tu teléfono.";

const recibidaImportacion = (s) => module.exports.enviarCorreo(s.email_solicitante, `Recibimos tu solicitud de importación ${s.codigo_seguimiento}`,
  `Hola ${s.nombre_solicitante},\n\nRecibimos tu solicitud de importación de "${s.nombre_producto}". `
  + `Tu código de seguimiento es ${s.codigo_seguimiento}.\n${FACTOR}\n${enlace(s.codigo_seguimiento)}\nCRISCOM`);

const recibidaArmado = (s) => module.exports.enviarCorreo(s.email_solicitante, `Recibimos tu solicitud de armado ${s.codigo_seguimiento}`,
  `Hola ${s.nombre_solicitante},\n\nRecibimos tu solicitud de armado de PC. Tu código de seguimiento es ${s.codigo_seguimiento}.\n`
  + `${FACTOR}\n${enlace(s.codigo_seguimiento)}\nCRISCOM`);

const cotizada = (s, { moneda, actualizada }) => module.exports.enviarCorreo(s.email_solicitante,
  `${actualizada ? "Actualizamos" : "Tenemos"} tu cotización ${s.codigo_seguimiento}`,
  `Hola ${s.nombre_solicitante},\n\n${actualizada ? "Actualizamos la cotización de tu solicitud" : "Ya cotizamos tu solicitud"} ${s.codigo_seguimiento}.\n\n`
  + `Monto cotizado: ${dinero(moneda, s.cotizacion_monto)}${moneda === "PEN" ? " (IGV incluido)" : ""}\n`
  + (s.valida_hasta ? `Válida hasta: ${fechaLegible(s.valida_hasta)}\n` : "")
  + (s.cotizacion_nota ? `\nNota de nuestro equipo:\n${s.cotizacion_nota}\n` : "")
  + `\n${FACTOR}\n${enlace(s.codigo_seguimiento)}\nCRISCOM`);

Object.assign(module.exports, { enviarCorreo, recibidaImportacion, recibidaArmado, cotizada });
