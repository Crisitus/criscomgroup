const { sequelize } = require("../config/database");
const S = require("./solicitud.service");

const MONTO_MAX = 99999999.99;
const own = (b, k) => Object.prototype.hasOwnProperty.call(b, k);
const lista = (v) => (v && v.length ? v.join(", ") : "ninguna");

// Valida el cuerpo del PUT /:id/estado. Devuelve { errores, datos } (todo opcional salvo lo enviado).
function leerCuerpo(b, cfg) {
  const errores = {};
  const datos = {};
  if (own(b, "estado")) {
    if (typeof b.estado !== "string" || !cfg.estados.includes(b.estado)) errores.estado = `Estado inválido. Debe ser uno de: ${cfg.estados.join(", ")}.`;
    else datos.estado = b.estado;
  }
  if (own(b, "cotizacion_monto")) {
    if (b.cotizacion_monto === null || b.cotizacion_monto === "") datos.monto = null;
    else {
      const n = typeof b.cotizacion_monto === "number" || typeof b.cotizacion_monto === "string" ? Number(b.cotizacion_monto) : NaN;
      if (!Number.isFinite(n) || n <= 0 || n > MONTO_MAX) errores.cotizacion_monto = `El monto debe ser un número mayor que 0 y menor o igual a ${MONTO_MAX.toLocaleString("en-US")}.`;
      else datos.monto = S.round2(n);
    }
  }
  for (const [campo, max] of [["cotizacion_nota", 2000], ["notas_admin", 4000]]) {
    if (!own(b, campo)) continue;
    if (b[campo] !== null && typeof b[campo] !== "string") errores[campo] = "Debe ser texto.";
    else if (S.str(b[campo]).length > max) errores[campo] = `Máximo ${max} caracteres.`;
    else datos[campo] = S.str(b[campo]) || null;
  }
  if (own(b, "fecha_entrega_estimada")) {
    const f = b.fecha_entrega_estimada;
    if (f === null || f === "") datos.fecha_entrega_estimada = null;
    else if (typeof f === "string" && S.fechaCivil(S.str(f).slice(0, 10))) datos.fecha_entrega_estimada = S.str(f).slice(0, 10);
    else errores.fecha_entrega_estimada = "Fecha inválida. Usa el formato AAAA-MM-DD.";
  }
  if (own(b, "vigencia_dias") && b.vigencia_dias !== null && b.vigencia_dias !== "") {
    const d = Number(b.vigencia_dias);
    if (!Number.isInteger(d) || d < 1 || d > 90) errores.vigencia_dias = "La vigencia debe ser de 1 a 90 días.";
    else datos.vigencia_dias = d;
  }
  return { errores, datos };
}

/**
 * Aplica un cambio de estado / cotización a una solicitud con la matriz de transiciones.
 * cfg: { estados, transiciones, cotizables, Historial, mensajeBloqueo }
 * Devuelve { status, message?, errores?, flags? }. Si status===200 el item queda guardado y recargado.
 */
async function actualizar(item, body, cfg, usuarioId) {
  const { errores, datos } = leerCuerpo(body || {}, cfg);
  if (Object.keys(errores).length) return { status: 400, message: "Revisa los campos marcados.", errores };

  const estadoAntes = item.estado;
  const estadoFinal = datos.estado || estadoAntes;
  const montoAntes = S.num(item.cotizacion_monto);
  const montoCambia = datos.monto !== undefined && datos.monto !== montoAntes;

  if (estadoFinal !== estadoAntes && !(cfg.transiciones[estadoAntes] || []).includes(estadoFinal)) {
    return { status: 409, message: `No se puede pasar de «${estadoAntes}» a «${estadoFinal}». Transiciones permitidas desde «${estadoAntes}»: ${lista(cfg.transiciones[estadoAntes])}.` };
  }
  if (montoCambia && !cfg.cotizables.includes(estadoAntes)) {
    return { status: 409, message: `La solicitud está «${estadoAntes}»: la cotización ya no se puede modificar.` };
  }
  const montoFinal = datos.monto !== undefined ? datos.monto : montoAntes;
  if (montoCambia && montoFinal === null && !cfg.cotizables.includes(estadoFinal)) {
    return { status: 409, message: "No puedes quitar el monto de una solicitud cotizada o aprobada. Devuélvela a revisión primero." };
  }
  const notaFinal = datos.cotizacion_nota !== undefined ? datos.cotizacion_nota : item.cotizacion_nota;
  const falta = {};
  if (["cotizada", "aprobada"].includes(estadoFinal) && !(montoFinal > 0)) falta.cotizacion_monto = "Indica el monto cotizado (mayor que 0).";
  if (estadoFinal === "cotizada" && !S.str(notaFinal)) falta.cotizacion_nota = "Escribe la nota que verá el cliente con la cotización.";
  if (estadoFinal === "rechazada" && !S.str(notaFinal)) falta.cotizacion_nota = "Indica el motivo del rechazo: lo verá el cliente.";
  if (Object.keys(falta).length) return { status: 400, message: "Faltan datos para este estado.", errores: falta };

  const ahora = new Date();
  const recotiza = montoCambia || (estadoFinal === "cotizada" && estadoAntes !== "cotizada");
  const cambios = [];
  const t = await sequelize.transaction();
  try {
    if (datos.estado) item.estado = datos.estado;
    if (montoCambia) item.cotizacion_monto = montoFinal;
    if (recotiza && montoFinal !== null) {
      item.cotizacion_fecha = ahora;
      item.valida_hasta = S.sumarDias(datos.vigencia_dias || S.VIGENCIA_DIAS, ahora);
    } else if (montoCambia && montoFinal === null) {
      item.cotizacion_fecha = null;
      item.valida_hasta = null;
    }
    for (const campo of ["cotizacion_nota", "notas_admin", "fecha_entrega_estimada"]) {
      if (datos[campo] !== undefined && datos[campo] !== item[campo]) { item[campo] = datos[campo]; cambios.push(campo); }
    }
    const filas = [];
    const base = { solicitud_id: item.id_solicitud, usuario_id: usuarioId || null };
    if (estadoFinal !== estadoAntes) filas.push({ ...base, accion: "estado", de: estadoAntes, a: estadoFinal, nota: datos.cotizacion_nota || null });
    if (montoCambia) filas.push({ ...base, accion: "cotizacion", de: estadoAntes, a: estadoFinal, monto_anterior: montoAntes, monto_nuevo: montoFinal, nota: datos.cotizacion_nota || null });
    if (cambios.length) filas.push({ ...base, accion: "datos", de: estadoAntes, a: estadoFinal, nota: `Campos: ${cambios.join(", ")}` });
    await item.save({ transaction: t });
    if (filas.length) await cfg.Historial.bulkCreate(filas, { transaction: t });
    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
  await item.reload();
  return {
    status: 200,
    flags: {
      cotizadaAhora: estadoFinal === "cotizada" && (estadoAntes !== "cotizada" || montoCambia),
      actualizada: estadoAntes === "cotizada" && montoCambia,
      sinCambios: estadoFinal === estadoAntes && !montoCambia && !cambios.length,
    },
  };
}

// Conteos por estado (ignora el filtro de estado, respeta la búsqueda).
async function resumenPorEstado(Model, estados, where) {
  const grupos = await Model.findAll({ where, attributes: ["estado", [sequelize.fn("COUNT", sequelize.col("id_solicitud")), "n"]], group: ["estado"], raw: true });
  const resumen = Object.fromEntries(estados.map((e) => [e, 0]));
  let total = 0;
  for (const g of grupos) { resumen[g.estado] = Number(g.n); total += Number(g.n); }
  resumen.total = total;
  return resumen;
}

module.exports = { actualizar, resumenPorEstado, leerCuerpo, MONTO_MAX };
