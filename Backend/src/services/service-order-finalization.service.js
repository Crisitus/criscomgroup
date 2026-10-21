const {
  OrdenServicio,
  OrdenServicioPago,
  OrdenServicioRepuesto,
  Venta,
  DetalleVenta,
} = require('../models');

const money = value => Math.round(Number(value || 0) * 100) / 100;

const classifyServiceOrder = parts => parts.length ? 'boleta_factura' : 'recibo_honorarios';

const finalizeServiceOrderBilling = async (orderId, userId, transaction) => {
  const order = await OrdenServicio.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order) throw new Error('Orden de servicio no encontrada');
  if (order.venta_id) return { order, sale: await Venta.unscoped().findByPk(order.venta_id, { transaction }), alreadyFinalized: true };

  const [parts, payments] = await Promise.all([
    OrdenServicioRepuesto.findAll({
      where: { id_orden_servicio: order.id_orden_servicio, estado_stock: ['no_aplica', 'reservado', 'consumido'] },
      transaction,
    }),
    OrdenServicioPago.findAll({
      where: { id_orden_servicio: order.id_orden_servicio, estado: 'confirmado' },
      transaction,
    }),
  ]);
  const total = money(Number(order.costo_repuestos) + Number(order.costo_mano_obra) + Number(order.recargo || 0) - Number(order.descuento || 0));
  const paid = money(payments.reduce((sum, payment) => sum + Number(payment.monto), 0));
  if (total <= 0) throw new Error('La orden no tiene un importe facturable');
  if (paid + 0.001 < total) throw new Error('La orden todavía tiene saldo pendiente');

  const classification = classifyServiceOrder(parts);
  const isInvoice = classification === 'boleta_factura' && /^\d{11}$/.test(String(order.documento || ''));
  const sale = await Venta.unscoped().create({
    fecha: new Date(),
    total: classification === 'recibo_honorarios' ? total : money(total / 1.18),
    total_con_igv: total,
    id_cajero: userId,
    metodo_pago: [...new Set(payments.map(payment => payment.metodo))].join('+') || 'otro',
    observaciones: `Orden de servicio ${order.codigo}`,
    tipo_documento: classification === 'recibo_honorarios' ? null : isInvoice ? '1' : '3',
    serie: classification === 'recibo_honorarios' ? null : isInvoice ? 'F001' : 'B001',
    cliente_tipo_documento: /^\d{11}$/.test(String(order.documento || '')) ? '6' : /^\d{8}$/.test(String(order.documento || '')) ? '1' : null,
    cliente_numero_documento: order.documento || null,
    cliente_nombre: order.cliente,
    estado_comprobante: 'pendiente',
    comprobante_emitido: false,
    tipo_vendedor_snapshot: 'servicio_tecnico',
    neto_vendedor: total,
    affiliate_business_id: order.affiliate_business_id || null,
    origen_tipo: 'orden_servicio',
    orden_servicio_id: order.id_orden_servicio,
    categoria_ingreso: 'servicios',
  }, { transaction });

  const lines = parts.map(part => ({
    venta_id: sale.venta_id,
    producto_id: part.id_producto || null,
    descripcion: part.descripcion,
    cantidad: part.cantidad,
    precio_unitario: money(Number(part.precio_unitario) / 1.18),
    precio_unitario_con_igv: part.precio_unitario,
    subtotal: money(Number(part.precio_unitario) * Number(part.cantidad) / 1.18),
    subtotal_con_igv: money(Number(part.precio_unitario) * Number(part.cantidad)),
    condicion: 'nuevo',
    garantia_meses: 0,
  }));
  const partsSale = money(parts.reduce((sum, part) => sum + Number(part.precio_unitario) * Number(part.cantidad), 0));
  const serviceSale = money(total - partsSale);
  if (serviceSale > 0) lines.push({
    venta_id: sale.venta_id,
    producto_id: null,
    descripcion: order.trabajo_realizado || (order.tipo === 'armado_pc' ? 'Servicio de armado de PC' : 'Servicio técnico y mano de obra'),
    cantidad: 1,
    precio_unitario: classification === 'recibo_honorarios' ? serviceSale : money(serviceSale / 1.18),
    precio_unitario_con_igv: serviceSale,
    subtotal: classification === 'recibo_honorarios' ? serviceSale : money(serviceSale / 1.18),
    subtotal_con_igv: serviceSale,
    condicion: 'nuevo',
    garantia_meses: 0,
  });
  await DetalleVenta.bulkCreate(lines, { transaction });
  await order.update({
    venta_id: sale.venta_id,
    clasificacion_fiscal: classification,
    estado_facturacion: 'pendiente_emision',
  }, { transaction });
  return { order, sale, classification, alreadyFinalized: false };
};

module.exports = { classifyServiceOrder, finalizeServiceOrderBilling };
