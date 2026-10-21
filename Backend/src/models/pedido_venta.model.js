const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('PedidoVenta', {
  id_pedido_venta: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_pedido: { type: DataTypes.INTEGER, allowNull: false },
  venta_id: { type: DataTypes.INTEGER, allowNull: false },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
  total_asignado: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, {
  tableName: 'pedido_ventas',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false,
  indexes: [{ unique: true, fields: ['id_pedido', 'venta_id'] }],
});
