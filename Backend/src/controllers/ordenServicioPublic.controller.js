const fs = require("fs");
const path = require("path");
const { OrdenServicio, OrdenServicioEvidencia, OrdenServicioEvento } = require("../models");

const orderByToken = (token) => OrdenServicio.findOne({
  where: { token_seguimiento: String(token || "").trim(), anulada: false },
});

exports.track = async (req, res) => {
  const order = await orderByToken(req.params.token);
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });
  const [evidences, events] = await Promise.all([
    OrdenServicioEvidencia.findAll({
      where: { id_orden_servicio: order.id_orden_servicio, visible_cliente: true, eliminada: false },
      attributes: ["id_evidencia_servicio", "etapa", "tipo", "mime", "descripcion", "creado_en"],
      order: [["creado_en", "ASC"]],
    }),
    OrdenServicioEvento.findAll({
      where: { id_orden_servicio: order.id_orden_servicio },
      attributes: ["tipo", "estado_nuevo", "creado_en"],
      order: [["creado_en", "ASC"]],
    }),
  ]);
  return res.json({
    codigo: order.codigo,
    equipo: order.equipo,
    estado: order.estado,
    fecha_ingreso: order.fecha_ingreso,
    fecha_entrega_estimada: order.fecha_entrega_estimada,
    garantia_fin: order.garantia_fin,
    avances: events.filter(event => event.estado_nuevo).map(event => ({ estado: event.estado_nuevo, fecha: event.creado_en })),
    evidencias: evidences.map(evidence => ({
      ...evidence.toJSON(),
      archivo_url: `/api/ecommerce/servicio-tecnico/seguimiento/${encodeURIComponent(order.token_seguimiento)}/evidencias/${evidence.id_evidencia_servicio}`,
    })),
  });
};

exports.evidenceFile = async (req, res) => {
  const order = await orderByToken(req.params.token);
  if (!order) return res.status(404).json({ message: "Evidencia no encontrada" });
  const evidence = await OrdenServicioEvidencia.findOne({
    where: {
      id_evidencia_servicio: req.params.evidenceId,
      id_orden_servicio: order.id_orden_servicio,
      visible_cliente: true,
      eliminada: false,
    },
  });
  if (!evidence) return res.status(404).json({ message: "Evidencia no encontrada" });
  const file = path.resolve(__dirname, "../uploads/private/service-evidence", path.basename(evidence.nombre_archivo));
  if (!fs.existsSync(file)) return res.status(404).json({ message: "Archivo no encontrado" });
  res.setHeader("Cache-Control", "private, max-age=300");
  res.type(evidence.mime);
  return res.sendFile(file);
};
