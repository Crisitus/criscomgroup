const { Op } = require('sequelize');
const { sequelize, AffiliateBusiness, AffiliateSettlement, AffiliatePayment, Venta, Producto, Compra, Cotizacion, OrdenServicio } = require('../models');
const User = require('../models/user.model');
const culqi = require('../services/culqi.service');
const { isoFields } = require('./user.controller');
const fs = require('fs');
const path = require('path');

const getBusiness = async (req) => {
  if (req.user.id_role === 1 && req.params.businessId) return AffiliateBusiness.findByPk(Number(req.params.businessId));
  return req.user.affiliate_business_id ? AffiliateBusiness.findByPk(req.user.affiliate_business_id) : null;
};

exports.list = async (req, res) => {
  const businesses = await AffiliateBusiness.findAll({ include: [{ model: AffiliateSettlement, as: 'settlements', include: [{ model: AffiliatePayment, as: 'payments' }] }], order: [['creado_en', 'DESC']] });
  const result = [];
  for (const business of businesses) {
    const id = business.id_affiliate_business;
    const [sales, margin, stockUnits, stockValue, purchases, quotes, services] = await Promise.all([
      Venta.unscoped().sum('total_con_igv', { where: { affiliate_business_id: id } }),
      Venta.unscoped().sum('neto_vendedor', { where: { affiliate_business_id: id } }),
      Producto.unscoped().sum('stock', { where: { affiliate_business_id: id } }),
      Producto.unscoped().findAll({ attributes: ['stock', 'costo_promedio'], where: { affiliate_business_id: id }, raw: true }),
      Compra.sum('total', { where: { affiliate_business_id: id } }),
      Cotizacion.count({ where: { affiliate_business_id: id } }),
      OrdenServicio.count({ where: { affiliate_business_id: id } }),
    ]);
    result.push({ ...business.toJSON(), summary: { ventas: Number(sales || 0), neto: Number(margin || 0), unidades_stock: Number(stockUnits || 0), valor_stock: Number(stockValue.reduce((sum, p) => sum + Number(p.stock) * Number(p.costo_promedio), 0).toFixed(2)), compras: Number(purchases || 0), cotizaciones: Number(quotes || 0), servicios: Number(services || 0) } });
  }
  return res.json(result);
};

exports.myAccount = async (req, res) => {
  const business = await getBusiness(req);
  if (!business) return res.status(404).json({ error: 'Negocio afiliado no encontrado' });
  const settlements = await AffiliateSettlement.findAll({ where: { affiliate_business_id: business.id_affiliate_business }, include: [{ model: AffiliatePayment, as: 'payments' }], order: [['periodo', 'DESC']] });
  return res.json({ business, settlements, culqi_public_key: await culqi.publicKey() });
};

exports.updateIdentity = async (req, res) => {
  const business = await getBusiness(req);
  if (!business || req.user.tipo_vendedor !== 'afiliado') {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    return res.status(403).json({ error: 'Solo el propietario afiliado puede configurar esta identidad' });
  }
  const name = String(req.body.nombre_comercial || '').trim();
  if (name.length < 3 || name.length > 120) {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    return res.status(422).json({ error: 'El nombre comercial debe tener entre 3 y 120 caracteres' });
  }
  if (!business.identidad_configurada && !req.file) return res.status(422).json({ error: 'El logo es obligatorio en la configuración inicial' });
  if (req.file && req.file.size > 2 * 1024 * 1024) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(422).json({ error: 'El logo no puede superar 2 MB' });
  }
  let logoUrl = business.logo_url;
  if (req.file) {
    if (logoUrl?.startsWith('/uploads/affiliate-logos/')) {
      const previous = path.join(__dirname, '..', 'uploads', 'affiliate-logos', path.basename(logoUrl));
      if (fs.existsSync(previous)) fs.rmSync(previous, { force: true });
    }
    logoUrl = `/uploads/affiliate-logos/${path.basename(req.file.path)}`;
  }
  await business.update({ nombre_comercial: name, logo_url: logoUrl, identidad_configurada: true });
  return res.json(business);
};

const DUE_DAYS = 10; // dias de gracia tras el cierre del periodo para pagar la liquidacion
const dayMs = 86400000;
const PAYMENT_METHODS = ['transferencia', 'efectivo', 'otro'];

// Vencimiento = 23:59:59 (Lima) del dia 10 del mes siguiente al periodo. Si la liquidacion se genera tarde
// (periodo ya cerrado hace mas de 10 dias) se concede un plazo de 10 dias desde hoy: nunca nace vencida.
const settlementDueDate = (year, month, now = new Date()) => {
  const afterClose = new Date(Date.UTC(year, month, DUE_DAYS + 1, 4, 59, 59));
  const fromNow = new Date(now.getTime() + DUE_DAYS * dayMs);
  return afterClose > fromNow ? afterClose : fromNow;
};

exports.generateSettlement = async (req, res) => {
  const business = await AffiliateBusiness.findByPk(Number(req.params.businessId));
  if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });
  const periodo = String(req.body.periodo || '');
  const match = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return res.status(422).json({ error: 'Periodo inválido (usa AAAA-MM)' });
  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = new Date(Date.UTC(year, month - 1, 1, 5));
  const end = new Date(Date.UTC(year, month, 1, 5));
  if (start > new Date()) return res.status(422).json({ error: 'No se puede liquidar un periodo futuro' });
  const trialEnd = business.prueba_finaliza_en ? new Date(business.prueba_finaliza_en) : null;
  if (trialEnd && end <= trialEnd) return res.status(409).json({ error: 'El afiliado todavía está dentro de sus 2 meses de prueba gratuita', prueba_finaliza_en: trialEnd });
  const billableStart = trialEnd && trialEnd > start ? trialEnd : start;
  const where = { affiliate_business_id: business.id_affiliate_business, fecha: { [Op.gte]: billableStart, [Op.lt]: end } };
  const gross = Number(await Venta.unscoped().sum('total_con_igv', { where }) || 0);
  const recordedCommission = Number(await Venta.unscoped().sum('comision_servicio', { where }) || 0);
  const fee = Number(business.comision_porcentaje || 8);
  const amount = Number(recordedCommission.toFixed(2));
  const due = settlementDueDate(year, month);
  const [settlement, created] = await AffiliateSettlement.findOrCreate({ where: { affiliate_business_id: business.id_affiliate_business, periodo }, defaults: { facturacion_valida: gross, porcentaje: fee, monto_comision: amount, vence_en: due } });
  if (!created && settlement.estado !== 'pagado') {
    const keepDue = settlement.vence_en && new Date(settlement.vence_en) > due ? settlement.vence_en : due;
    await settlement.update({ facturacion_valida: gross, porcentaje: fee, monto_comision: amount, vence_en: keepDue });
  }
  await settlement.reload();
  // periodo_cerrado=false -> el monto es parcial hasta que termine el mes y se vuelva a generar.
  return res.status(created ? 201 : 200).json({ ...isoFields(settlement.toJSON(), ['vence_en', 'pagado_en', 'creado_en', 'actualizado_en']), periodo_cerrado: end <= new Date() });
};

exports.submitPayment = async (req, res) => {
  const settlement = await AffiliateSettlement.findByPk(Number(req.params.settlementId), { include: [{ model: AffiliateBusiness, as: 'business' }] });
  if (!settlement) return res.status(404).json({ error: 'Liquidación no encontrada' });
  const isManager = req.user.id_role === 1;
  if (!isManager && Number(req.user.affiliate_business_id) !== Number(settlement.affiliate_business_id)) return res.status(403).json({ error: 'Acceso denegado' });
  if (settlement.estado === 'pagado') return res.status(409).json({ error: 'La liquidación ya está pagada' });
  const amount = Number(req.body.monto);
  if (!Number.isFinite(amount) || amount < Number(settlement.monto_comision)) return res.status(422).json({ error: 'El monto no cubre la comisión pendiente' });
  if (!PAYMENT_METHODS.includes(String(req.body.metodo))) return res.status(422).json({ error: 'Método de pago inválido (transferencia, efectivo u otro)' });
  const referencia = String(req.body.referencia || '').trim().slice(0, 120);
  if (referencia.length < 3) return res.status(422).json({ error: 'Ingresa la referencia o número de operación' });
  const receipt = req.body.comprobante_url ? String(req.body.comprobante_url).trim() : null;
  if (receipt && (receipt.length > 255 || !/^(\/uploads\/|https:\/\/)/.test(receipt))) return res.status(422).json({ error: 'El comprobante debe ser una ruta /uploads/ o un enlace https' });
  if (await AffiliatePayment.findOne({ where: { settlement_id: settlement.id_settlement, estado: 'pendiente' } })) return res.status(409).json({ error: 'Ya hay un pago pendiente de validación para esta liquidación' });
  const payment = await AffiliatePayment.create({ settlement_id: settlement.id_settlement, monto: amount, metodo: req.body.metodo, referencia, comprobante_url: receipt, estado: 'pendiente', registrado_por: req.user.id_user, observaciones: req.body.observaciones ? String(req.body.observaciones).slice(0, 1000) : null });
  return res.status(201).json(payment);
};

exports.validatePayment = async (req, res) => {
  const result = await sequelize.transaction(async transaction => {
    const payment = await AffiliatePayment.findByPk(Number(req.params.paymentId), { include: [{ model: AffiliateSettlement, as: 'settlement', include: [{ model: AffiliateBusiness, as: 'business' }] }], transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) return { status: 404, body: { error: 'Pago no encontrado' } };
    if (payment.estado !== 'pendiente') return { status: 409, body: { error: 'El pago ya fue procesado' } };
    const approved = req.body.aprobado === true;
    if (approved && Number(payment.monto) < Number(payment.settlement.monto_comision)) {
      return { status: 409, body: { error: 'El pago ya no cubre la comisión actual de la liquidación (cambió al regenerarla). Recházalo o pide un pago complementario' } };
    }
    await payment.update({ estado: approved ? 'validado' : 'rechazado', validado_por: req.user.id_user, validado_en: new Date(), observaciones: req.body.observaciones || payment.observaciones }, { transaction });
    if (approved) {
      await payment.settlement.update({ estado: 'pagado', pagado_en: new Date() }, { transaction });
      // Se reactiva el negocio solo si no le quedan otras liquidaciones vencidas sin pagar.
      const stillOverdue = await AffiliateSettlement.count({ where: { affiliate_business_id: payment.settlement.affiliate_business_id, id_settlement: { [Op.ne]: payment.settlement.id_settlement }, estado: { [Op.in]: ['pendiente', 'vencido'] }, vence_en: { [Op.lt]: new Date() } }, transaction });
      if (!stillOverdue) await payment.settlement.business.update({ estado: 'activo' }, { transaction });
    }
    return { status: 200, body: payment };
  });
  return res.status(result.status).json(result.body);
};

exports.payByCard = async (req, res) => {
  const settlement = await AffiliateSettlement.findByPk(Number(req.params.settlementId));
  if (!settlement || Number(req.user.affiliate_business_id) !== Number(settlement.affiliate_business_id)) return res.status(404).json({ error: 'Liquidación no encontrada' });
  if (settlement.estado === 'pagado') return res.json({ success: true, already_paid: true });
  const user = await User.findByPk(req.user.id_user);
  const key = `affiliate-settlement-${settlement.id_settlement}`;
  let payment = await AffiliatePayment.findOne({ where: { idempotency_key: key } });
  if (payment?.estado === 'validado') return res.json({ success: true, already_paid: true });
  const amount = Math.round(Number(settlement.monto_comision) * 100);
  let charge;
  try {
    charge = await culqi.createCharge({ token: req.body.token, amount, email: user.email, orderNumber: `AF-${settlement.id_settlement}`, idempotencyKey: key });
    if (charge.outcome?.type !== 'venta_exitosa' || Number(charge.amount) !== amount) throw new Error('El cargo no coincide con la liquidación');
    await sequelize.transaction(async transaction => {
      if (!payment) payment = await AffiliatePayment.create({ settlement_id: settlement.id_settlement, monto: settlement.monto_comision, metodo: 'tarjeta', referencia: charge.id, idempotency_key: key, estado: 'validado', registrado_por: user.id_user, validado_por: user.id_user, validado_en: new Date(), observaciones: JSON.stringify(culqi.sanitizeCharge(charge)) }, { transaction });
      else await payment.update({ referencia: charge.id, estado: 'validado', validado_por: user.id_user, validado_en: new Date(), observaciones: JSON.stringify(culqi.sanitizeCharge(charge)) }, { transaction });
      await settlement.update({ estado: 'pagado', pagado_en: new Date() }, { transaction });
      await AffiliateBusiness.update({ estado: 'activo' }, { where: { id_affiliate_business: settlement.affiliate_business_id }, transaction });
    });
    return res.json({ success: true, charge: culqi.sanitizeCharge(charge) });
  } catch (error) {
    if (charge?.id) return res.status(202).json({ success: false, pending_reconciliation: true, message: 'El pago fue recibido y requiere conciliación. No vuelvas a pagarlo.' });
    return res.status(400).json({ success: false, message: error.response?.data?.merchant_message || error.message });
  }
};

// Ningun handler async puede dejar la peticion colgada: cualquier excepcion responde 500 con cuerpo JSON.
for (const name of Object.keys(exports)) {
  const handler = exports[name];
  exports[name] = async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      console.error(`Error en affiliates.${name}:`, error);
      if (res.headersSent) return undefined;
      return res.status(500).json({ error: 'No se pudo completar la operación', message: 'No se pudo completar la operación' });
    }
  };
}
