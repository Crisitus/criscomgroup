const { AdquirentePos, PagoPos, Venta } = require('../models');

const normalizeRef = value => String(value || '').trim().toUpperCase();

exports.listAdquirentes = async (req, res) => {
  const where = req.query.todos === '1' && req.user.id_role === 1 ? {} : { activo: true, predeterminado: true };
  const adquirentes = await AdquirentePos.findAll({ where, order: [['orden', 'ASC'], ['nombre', 'ASC']] });
  res.json({ adquirentes });
};

exports.createAdquirente = async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  if (!nombre || nombre.length > 60) return res.status(400).json({ message: 'Nombre de adquirente invalido' });
  const adquirente = await AdquirentePos.create({
    nombre, marca: String(req.body.marca || '').trim() || null,
    activo: req.body.activo !== false, predeterminado: false, requiere_referencia: req.body.requiere_referencia !== false,
    canales: Array.isArray(req.body.canales) ? req.body.canales.filter(c => ['pos', 'qr', 'link'].includes(c)) : ['pos', 'qr', 'link'],
    modo_confirmacion: 'manual', link_pago_url: String(req.body.link_pago_url || '').trim() || null,
    orden: Number.isInteger(Number(req.body.orden)) ? Number(req.body.orden) : 0,
  });
  res.status(201).json({ adquirente });
};

exports.updateAdquirente = async (req, res) => {
  const adquirente = await AdquirentePos.findByPk(req.params.id);
  if (!adquirente) return res.status(404).json({ message: 'Adquirente no encontrado' });
  const allowed = ['nombre', 'marca', 'activo', 'predeterminado', 'requiere_referencia', 'orden', 'canales', 'link_pago_url'];
  const changes = Object.fromEntries(allowed.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]]));
  if (changes.nombre !== undefined) changes.nombre = String(changes.nombre).trim();
  const transaction = await AdquirentePos.sequelize.transaction();
  try {
    if (changes.predeterminado === true) {
      await AdquirentePos.update({ predeterminado: false }, { where: {}, transaction });
      changes.activo = true;
    }
    await adquirente.update(changes, { transaction });
    await transaction.commit();
  } catch (error) { await transaction.rollback(); throw error; }
  res.json({ adquirente });
};

exports.listPagos = async (req, res) => {
  const pagos = await PagoPos.findAll({
    include: [{ model: AdquirentePos, as: 'adquirente' }, { model: Venta, as: 'venta', attributes: ['venta_id', 'fecha', 'total_con_igv'] }],
    order: [['creado_en', 'DESC']], limit: 200,
  });
  res.json({ pagos });
};

exports.confirmarPagoVenta = async (req, res) => {
  const pago = await PagoPos.findOne({ where: { venta_id: Number(req.params.ventaId) }, include: [{ model: AdquirentePos, as: 'adquirente' }] });
  if (!pago) return res.status(404).json({ message: 'La venta no tiene un pago externo vinculado' });
  if (pago.estado === 'confirmado') return res.json({ message: 'El pago ya estaba confirmado', pago });
  if (pago.estado === 'anulado') return res.status(409).json({ message: 'No se puede confirmar un pago anulado' });
  await pago.update({ estado: 'confirmado', confirmado_por: req.user.id_user, confirmado_en: new Date() });
  res.json({ message: 'Pago confirmado y vinculado con la venta', pago });
};

exports.validatePaymentInput = async (posPago, totalCentimos, transaction) => {
  if (!posPago) throw Object.assign(new Error('Debes registrar los datos del voucher POS'), { status: 400 });
  const adquirente = await AdquirentePos.findOne({ where: { id_adquirente: Number(posPago.id_adquirente), activo: true, predeterminado: true }, transaction });
  if (!adquirente) throw Object.assign(new Error('El adquirente POS no existe o esta inactivo'), { status: 400 });
  const canal = String(posPago.canal || 'pos');
  if (!['pos', 'qr', 'link'].includes(canal) || !(adquirente.canales || ['pos', 'qr', 'link']).includes(canal)) throw Object.assign(new Error('El canal de pago no esta habilitado por Crisitus'), { status: 400 });
  const numero_operacion = normalizeRef(posPago.numero_operacion);
  if (adquirente.requiere_referencia && !numero_operacion) throw Object.assign(new Error('Ingresa el numero de operacion del voucher'), { status: 400 });
  if (numero_operacion.length > 80 || (numero_operacion && !/^[A-Z0-9._/-]+$/.test(numero_operacion))) throw Object.assign(new Error('Numero de operacion POS invalido'), { status: 400 });
  return { adquirente, canal, numero_operacion, monto_centimos: totalCentimos };
};

exports.normalizeRef = normalizeRef;
