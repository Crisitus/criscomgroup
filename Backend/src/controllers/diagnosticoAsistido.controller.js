const crypto = require('crypto');
const { Op } = require('sequelize');
const { OrdenServicio, OrdenServicioDiagnostico, OrdenServicioEvento, sequelize } = require('../models');
const { analyzeDiagnostic } = require('../services/diagnostic-assistant.service');

const uid = req => req.user.id_user || req.user.id;
const tenant = req => req.user.tipo_vendedor === 'afiliado' ? Number(req.user.affiliate_business_id) : null;
const orderFor = (req, id) => OrdenServicio.findOne({ where: { id_orden_servicio: id, affiliate_business_id: tenant(req), anulada: false } });

exports.list = async (req, res) => {
  const order = await orderFor(req, req.params.id);
  if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
  res.json(await OrdenServicioDiagnostico.findAll({ where: { id_orden_servicio: order.id_orden_servicio }, order: [['creado_en', 'DESC']] }));
};

exports.generate = async (req, res) => {
  try {
    const order = await orderFor(req, req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    const sintomas = String(req.body.sintomas || order.detalle || '').trim();
    if (sintomas.length < 8 || sintomas.length > 5000) return res.status(400).json({ message: 'Describe los síntomas entre 8 y 5000 caracteres' });
    const pruebas = req.body.pruebas && typeof req.body.pruebas === 'object' && !Array.isArray(req.body.pruebas) ? req.body.pruebas : {};
    const resultado = analyzeDiagnostic({ sintomas, pruebas });
    const latest = await OrdenServicioDiagnostico.max('version', { where: { id_orden_servicio: order.id_orden_servicio } });
    const inputHash = crypto.createHash('sha256').update(JSON.stringify({ sintomas, pruebas })).digest('hex');
    const record = await OrdenServicioDiagnostico.create({ id_orden_servicio: order.id_orden_servicio, version: Number(latest || 0) + 1, sintomas, pruebas, resultado, motor: resultado.engine, entrada_hash: inputHash, creado_por: uid(req) });
    await OrdenServicioEvento.create({ id_orden_servicio: order.id_orden_servicio, tipo: 'diagnostico_asistido', detalle: `Diagnóstico asistido #${record.id_diagnostico_asistido} generado; requiere revisión humana.`, creado_por: uid(req) });
    res.status(201).json(record);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.review = async (req, res) => {
  if (!['aceptado', 'rechazado'].includes(req.body.estado)) return res.status(400).json({ message: 'Revisión inválida' });
  const transaction = await sequelize.transaction();
  try {
    const order = await OrdenServicio.findOne({ where: { id_orden_servicio: req.params.id, affiliate_business_id: tenant(req), anulada: false }, transaction, lock: transaction.LOCK.UPDATE });
    if (!order) { await transaction.rollback(); return res.status(404).json({ message: 'Orden no encontrada' }); }
    const isManager = req.user.id_role === 1;
    const isAssignedTechnician = req.user.id_role === 6 && Number(order.tecnico_id) === Number(uid(req));
    if (!isManager && !isAssignedTechnician) { await transaction.rollback(); return res.status(403).json({ message: 'Solo el gerente o el técnico asignado pueden revisar el diagnóstico' }); }
    const record = await OrdenServicioDiagnostico.findOne({ where: { id_diagnostico_asistido: req.params.diagnosticId, id_orden_servicio: order.id_orden_servicio }, transaction, lock: transaction.LOCK.UPDATE });
    if (!record) { await transaction.rollback(); return res.status(404).json({ message: 'Diagnóstico no encontrado' }); }
    if (record.estado !== 'borrador') { await transaction.rollback(); return res.status(409).json({ message: 'Este diagnóstico ya fue revisado' }); }
    const finalText = String(req.body.diagnostico_final || '').trim();
    if (req.body.estado === 'aceptado' && (finalText.length < 12 || finalText.length > 5000)) { await transaction.rollback(); return res.status(400).json({ message: 'El técnico debe redactar un diagnóstico final entre 12 y 5000 caracteres' }); }
    if (req.body.estado === 'aceptado') await OrdenServicioDiagnostico.update({ estado: 'reemplazado' }, { where: { id_orden_servicio: order.id_orden_servicio, estado: 'aceptado', id_diagnostico_asistido: { [Op.ne]: record.id_diagnostico_asistido } }, transaction });
    await record.update({ estado: req.body.estado, diagnostico_final: req.body.estado === 'aceptado' ? finalText : null, revision_nota: String(req.body.nota || '').trim() || null, revisado_por: uid(req), revisado_en: new Date() }, { transaction });
    if (req.body.estado === 'aceptado') {
      await order.update({ diagnostico_configuracion: finalText, estado: order.estado === 'recibido' ? 'diagnostico' : order.estado }, { transaction });
    }
    await OrdenServicioEvento.create({ id_orden_servicio: order.id_orden_servicio, tipo: 'diagnostico_asistido', detalle: `Diagnóstico asistido v${record.version} ${req.body.estado} por revisión humana.`, creado_por: uid(req) }, { transaction });
    await transaction.commit();
    res.json(record);
  } catch (error) { await transaction.rollback().catch(() => {}); res.status(400).json({ message: error.message }); }
};
