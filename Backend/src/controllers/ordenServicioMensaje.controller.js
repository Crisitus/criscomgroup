const crypto = require('crypto');
const { OrdenServicio, OrdenServicioMensaje, OrdenServicioEvento, OrdenServicioCanalEvento, OrdenServicioEvidencia } = require('../models');
const { renderWhatsapp } = require('../services/whatsapp-template.service');
const uid = req => req.user.id_user || req.user.id;
const tenant = req => req.user.tipo_vendedor === 'afiliado' ? Number(req.user.affiliate_business_id) : null;
const orderFor = (req, id) => OrdenServicio.findOne({ where: { id_orden_servicio: id, affiliate_business_id: tenant(req), anulada: false } });
const canCommunicate = (req, order) => req.user.id_role === 1 || Number(order.tecnico_id) === Number(uid(req));

exports.list = async (req, res) => {
  const order = await orderFor(req, req.params.id);
  if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
  if (!canCommunicate(req, order)) return res.status(403).json({ message: 'Solo el gerente o el técnico asignado pueden consultar comunicaciones' });
  res.json(await OrdenServicioMensaje.findAll({ where: { id_orden_servicio: order.id_orden_servicio }, order: [['creado_en', 'DESC']], attributes: { exclude: ['telefono_hash'] } }));
};

exports.channelTimeline = async (req, res) => {
  const order = await orderFor(req, req.params.id);
  if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
  if (!canCommunicate(req, order)) return res.status(403).json({ message: 'Solo el gerente o el técnico asignado pueden consultar comunicaciones' });
  const records = await OrdenServicioCanalEvento.findAll({
    where: { id_orden_servicio: order.id_orden_servicio },
    include: [{ model: OrdenServicioEvidencia, as: 'evidencia', required: false, attributes: ['id_evidencia_servicio', 'tipo', 'mime', 'descripcion', 'origen', 'visible_cliente', 'creado_en'] }],
    order: [['recibido_en', 'ASC']],
    attributes: { exclude: ['remitente_hash'] },
  });
  res.json(records.map(record => {
    const item = record.toJSON();
    if (item.evidencia) item.evidencia.archivo_url = `/ordenes-servicio/${order.id_orden_servicio}/evidencias/${item.evidencia.id_evidencia_servicio}/archivo`;
    return item;
  }));
};

exports.prepare = async (req, res) => {
  try {
    const order = await orderFor(req, req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    if (!canCommunicate(req, order)) return res.status(403).json({ message: 'Solo el gerente o el técnico asignado pueden preparar el mensaje' });
    if (!order.whatsapp_consentimiento) return res.status(409).json({ message: 'Falta registrar el consentimiento del cliente para contacto por WhatsApp' });
    const rendered = renderWhatsapp({ order, template: req.body.plantilla, publicBaseUrl: process.env.PUBLIC_SITE_URL || '' });
    const record = await OrdenServicioMensaje.create({ id_orden_servicio: order.id_orden_servicio, plantilla: req.body.plantilla, telefono_ultimos4: rendered.phone.slice(-4), telefono_hash: crypto.createHash('sha256').update(rendered.phone).digest('hex'), contenido: rendered.message, consentimiento_fuente: order.whatsapp_consentimiento_fuente || 'orden', preparado_por: uid(req) });
    res.status(201).json({ id_mensaje_servicio: record.id_mensaje_servicio, contenido: record.contenido, url: rendered.url, estado: record.estado });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.markOpened = async (req, res) => {
  const order = await orderFor(req, req.params.id);
  if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
  if (!canCommunicate(req, order)) return res.status(403).json({ message: 'Solo el gerente o el técnico asignado pueden registrar la apertura' });
  const record = await OrdenServicioMensaje.findOne({ where: { id_mensaje_servicio: req.params.messageId, id_orden_servicio: order.id_orden_servicio } });
  if (!record) return res.status(404).json({ message: 'Mensaje no encontrado' });
  if (record.estado === 'preparado') await record.update({ estado: 'abierto', abierto_en: new Date() });
  await OrdenServicioEvento.create({ id_orden_servicio: order.id_orden_servicio, tipo: 'whatsapp_manual', detalle: `Plantilla ${record.plantilla} abierta manualmente en WhatsApp. No confirma entrega ni lectura.`, creado_por: uid(req) });
  res.json({ success: true, estado: record.estado });
};
