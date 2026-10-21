'use strict';
const { Op, literal } = require('sequelize');
const { Producto, MovimientoInventario } = require('../models');

/**
 * Unico punto de escritura de productos.stock + kardex (movimientos_inventario).
 *
 * - delta < 0: UPDATE guardado atomico (SET stock = stock - n WHERE stock >= n).
 *   Si no alcanza, no descuenta nada y lanza Error con status 400 y stockActual.
 * - delta > 0: incremento atomico.
 * - Tras el UPDATE la fila queda bloqueada por la transaccion llamadora: la
 *   relectura es el valor real y el movimiento registra stock anterior/nuevo
 *   exactos. Nunca read-modify-write en JS.
 */
const aplicarMovimiento = async ({
  productoId,
  delta,
  tipo,
  referenciaTipo = null,
  referenciaId = null,
  motivo = '',
  usuarioId = null,
  affiliateBusinessId = null,
  costoUnitario = null,
  transaction,
}) => {
  if (!transaction) throw new Error('aplicarMovimiento requiere una transaccion');
  const cantidad = Math.abs(Number(delta));
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('La cantidad del movimiento debe ser un entero mayor que cero');

  const where = { id_producto: productoId };
  if (delta < 0) where.stock = { [Op.gte]: cantidad };
  const [afectados] = await Producto.unscoped().update(
    { stock: literal(`stock ${delta < 0 ? '-' : '+'} ${cantidad}`) },
    { where, transaction, validate: false }
  );

  const actual = await Producto.unscoped().findByPk(productoId, { attributes: ['stock'], transaction });
  if (afectados === 0) {
    const error = new Error(`Stock insuficiente. Solicitado: ${cantidad}, Disponible: ${actual ? Number(actual.stock) : 0}`);
    error.status = 400;
    error.stockActual = actual ? Number(actual.stock) : 0;
    throw error;
  }

  const stockNuevo = Number(actual.stock);
  const stockAnterior = stockNuevo - Number(delta);
  await MovimientoInventario.create({
    producto_id: productoId,
    tipo,
    cantidad,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    costo_unitario: costoUnitario,
    referencia_tipo: referenciaTipo,
    referencia_id: referenciaId,
    motivo,
    usuario_id: usuarioId,
    affiliate_business_id: affiliateBusinessId,
  }, { transaction });
  return { stockAnterior, stockNuevo };
};

module.exports = { aplicarMovimiento };
