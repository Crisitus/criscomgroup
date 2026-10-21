const crypto = require('crypto');
const { SolicitudServicio, OrdenServicio } = require('../models');

exports.createPublic = async (req, res) => {
  try {
    const { cliente, telefono, email, tipo_equipo, marca_modelo, falla, disponibilidad, consentimiento_contacto } = req.body;
    if (![cliente, telefono, tipo_equipo, falla].every(value => String(value || '').trim())) return res.status(400).json({ message: 'Nombre, teléfono, tipo de equipo y falla son obligatorios' });
    if (consentimiento_contacto !== true) return res.status(400).json({ message: 'Debes autorizar el contacto relacionado con esta solicitud' });
    const codigo = `WEB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const solicitud = await SolicitudServicio.create({ codigo, cliente: String(cliente).trim(), telefono: String(telefono).trim(), email: email || null, tipo_equipo, marca_modelo: marca_modelo || null, falla, disponibilidad: disponibilidad || null, consentimiento_contacto: true, consentimiento_contacto_en: new Date() });
    res.status(201).json({ success: true, codigo: solicitud.codigo, message: 'Solicitud recibida. Te contactaremos para coordinar el ingreso del equipo.' });
  } catch (error) { res.status(400).json({ message: error.message }); }
};
exports.list = async (_req, res) => res.json(await SolicitudServicio.findAll({ order: [['creado_en', 'DESC']] }));
exports.update = async (req, res) => { const item = await SolicitudServicio.findByPk(req.params.id); if (!item) return res.status(404).json({ message: 'Solicitud no encontrada' }); await item.update({ estado: req.body.estado ?? item.estado, notas_admin: req.body.notas_admin ?? item.notas_admin }); res.json(item); };
exports.convert = async (req, res) => {
  const item = await SolicitudServicio.findByPk(req.params.id); if (!item) return res.status(404).json({ message: 'Solicitud no encontrada' });
  if (item.id_orden_servicio) return res.status(409).json({ message: 'La solicitud ya fue convertida' });
  const order = await OrdenServicio.create({ tipo: 'servicio_tecnico', codigo: `ST-${Date.now().toString().slice(-8)}`, cliente: item.cliente, telefono: item.telefono, whatsapp_consentimiento: item.consentimiento_contacto, whatsapp_consentimiento_en: item.consentimiento_contacto_en, whatsapp_consentimiento_fuente: `solicitud web ${item.codigo}`, equipo: [item.tipo_equipo, item.marca_modelo].filter(Boolean).join(' · '), detalle: item.falla, accesorios: `Origen: solicitud web ${item.codigo}. Estado físico pendiente de verificar al recibir.`, diagnostico_configuracion: '', trabajo_realizado: '', estado: 'recibido', moneda: 'PEN', costo_repuestos: 0, costo_mano_obra: 0, adelanto: 0, fecha_ingreso: new Date().toISOString().slice(0,10), garantia_dias: 30, notas: item.disponibilidad ? `Disponibilidad indicada: ${item.disponibilidad}` : '', creado_por: req.user.id_user || req.user.id });
  await item.update({ estado: 'recibido', id_orden_servicio: order.id_orden_servicio }); res.status(201).json(order);
};
