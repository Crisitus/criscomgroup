const { Op } = require('sequelize');
const { sequelize, Pedido, PedidoDetalle, Pago } = require('../models');

const deleteUnpaidOrder = async (orderId, transaction) => {
  await Pago.destroy({ where: { id_pedido: orderId }, transaction });
  await PedidoDetalle.destroy({ where: { id_pedido: orderId }, transaction });
  return Pedido.destroy({ where: { id_pedido: orderId, estado_pago: { [Op.ne]: 'pagado' }, venta_id: null }, transaction });
};

const cleanupExpiredOrders = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expired = await Pedido.findAll({
    attributes: ['id_pedido'],
    where: {
      estado_pago: { [Op.ne]: 'pagado' },
      venta_id: null,
      fecha_creacion: { [Op.lt]: cutoff },
    },
  });
  for (const order of expired) {
    await sequelize.transaction(transaction => deleteUnpaidOrder(order.id_pedido, transaction));
  }
  return expired.length;
};

const startOrderExpirationJob = () => {
  cleanupExpiredOrders().catch(error => console.error('No se pudieron depurar pedidos vencidos:', error.message));
  const timer = setInterval(() => {
    cleanupExpiredOrders().catch(error => console.error('No se pudieron depurar pedidos vencidos:', error.message));
  }, 15 * 60 * 1000);
  timer.unref();
};

module.exports = { cleanupExpiredOrders, deleteUnpaidOrder, startOrderExpirationJob };
