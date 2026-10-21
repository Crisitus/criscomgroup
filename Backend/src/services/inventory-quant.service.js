const { Op } = require('sequelize');
const { InventarioQuant, InventarioReserva } = require('../models');

const clean = value => String(value || '').trim() || null;
const identityFor = ({ lote, numero_serie }) => `lot:${clean(lote) || '-'}|serial:${clean(numero_serie) || '-'}`.toLowerCase();

const reserveQuant = async ({ productoId, cantidad, ubicacionId, lote, numeroSerie, repuestoId, userId, affiliateBusinessId, transaction }) => {
  if (!ubicacionId && !lote && !numeroSerie) return null;
  const where = { producto_id: productoId, affiliate_business_id: affiliateBusinessId || null, disponible: { [Op.gte]: cantidad } };
  if (ubicacionId) where.ubicacion_id = Number(ubicacionId);
  if (lote) where.lote = clean(lote);
  if (numeroSerie) where.numero_serie = clean(numeroSerie);
  const quant = await InventarioQuant.findOne({ where, transaction, lock: transaction.LOCK.UPDATE, order: [['creado_en', 'ASC']] });
  if (!quant) throw new Error('No existe disponibilidad para esa ubicación, lote o serie');
  if (quant.numero_serie && cantidad !== 1) throw new Error('Una unidad serializada solo puede reservarse una vez');
  await quant.update({ disponible: Number(quant.disponible) - cantidad, reservado: Number(quant.reservado) + cantidad }, { transaction });
  return InventarioReserva.create({ quant_id: quant.id_quant_inventario, repuesto_servicio_id: repuestoId, cantidad, creada_por: userId, affiliate_business_id: affiliateBusinessId || null }, { transaction });
};

const closeReservations = async ({ repuestoId, estado, userId, transaction }) => {
  const reservations = await InventarioReserva.findAll({ where: { repuesto_servicio_id: repuestoId, estado: 'activa' }, transaction, lock: transaction.LOCK.UPDATE });
  for (const reservation of reservations) {
    const quant = await InventarioQuant.findByPk(reservation.quant_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!quant || Number(quant.reservado) < Number(reservation.cantidad)) throw new Error('La reserva no coincide con el quant de inventario');
    const changes = { reservado: Number(quant.reservado) - Number(reservation.cantidad) };
    if (estado === 'liberada') changes.disponible = Number(quant.disponible) + Number(reservation.cantidad);
    await quant.update(changes, { transaction });
    await reservation.update({ estado, cerrada_por: userId, cerrada_en: new Date() }, { transaction });
  }
  return reservations.length;
};

module.exports = { identityFor, reserveQuant, closeReservations };
