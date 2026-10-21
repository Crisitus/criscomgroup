const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('MovimientoInventario', {
  id_movimiento: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  producto_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.ENUM('compra', 'venta', 'ajuste_entrada', 'ajuste_salida', 'reserva', 'liberacion'), allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  stock_anterior: { type: DataTypes.INTEGER, allowNull: false },
  stock_nuevo: { type: DataTypes.INTEGER, allowNull: false },
  costo_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  referencia_tipo: { type: DataTypes.STRING(40), allowNull: true },
  referencia_id: { type: DataTypes.INTEGER, allowNull: true },
  motivo: { type: DataTypes.STRING(255), allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'movimientos_inventario', createdAt: 'creado_en', updatedAt: false });
