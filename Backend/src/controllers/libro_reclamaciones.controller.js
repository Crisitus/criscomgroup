const svc = require("../services/reclamaciones.service");

const fail = (res, status, message, errores) => res.status(status).json(errores ? { message, errores } : { message });
const safe = (fn, label) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error(`[libro-reclamaciones] ${label}:`, error);
    if (!res.headersSent) fail(res, 500, "Error interno al procesar la hoja de reclamación.");
  }
};

// GET /?page&limit&estado&tipo&q&vencido -> { rows, total, page, limit, resumen }
exports.getAll = safe(async (req, res) => {
  const out = await svc.listar(req.query);
  if (out.errores) return fail(res, 400, "Filtros inválidos.", out.errores);
  res.json(out);
}, "listar");

// GET /export.csv (mismos filtros que el listado)
exports.exportCsv = safe(async (req, res) => {
  const out = await svc.exportarCsv(req.query);
  if (out.errores) return fail(res, 400, "Filtros inválidos.", out.errores);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="libro-reclamaciones-${svc.hoyLima()}.csv"`);
  res.setHeader("X-Total-Count", String(out.total));
  res.send(out.csv);
}, "exportar");

exports.getById = safe(async (req, res) => {
  const hoja = await svc.LibroReclamaciones.findByPk(req.params.id);
  if (!hoja) return fail(res, 404, "Reclamo no encontrado");
  res.json(svc.aSalida(hoja));
}, "detalle");

// PUT /:id  Solo { estado, respuesta }; cualquier otro campo se ignora.
exports.update = safe(async (req, res) => {
  const hoja = await svc.LibroReclamaciones.findByPk(req.params.id);
  if (!hoja) return fail(res, 404, "Reclamo no encontrado");
  const check = svc.validarCambio(hoja, req.body || {});
  if (check.status) return fail(res, check.status, check.message, check.errores);
  const cambios = { ...check.cambios };
  if (cambios.estado === "respondido") {
    cambios.fecha_respuesta = new Date();
    cambios.respondido_por = req.user?.id ?? null;
  }
  // Condicional al estado leido: si otro usuario cambio la hoja entre medias, no se pisa.
  const [afectadas] = await svc.LibroReclamaciones.update(cambios, { where: { id_reclamo: hoja.id_reclamo, estado: hoja.estado } });
  if (!afectadas) return fail(res, 409, "La hoja cambió mientras la editabas. Recarga e inténtalo de nuevo.");
  await hoja.reload();
  const out = svc.aSalida(hoja);
  if (cambios.estado === "respondido") out.correo = await svc.enviarCorreo(svc.mensajeRespuesta(hoja.toJSON()));
  res.json(out);
}, "actualizar");
