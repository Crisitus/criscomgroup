const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('CompraDetalle', {
  id_compra_detalle: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  compra_id: { type: DataTypes.INTEGER, allowNull: false },
  producto_id: { type: DataTypes.INTEGER, allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  costo_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  costo_asignado: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: 'compra_detalles', timestamps: false });
