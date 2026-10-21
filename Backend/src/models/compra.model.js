const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Compra', {
  id_compra: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  proveedor_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  documento: { type: DataTypes.STRING(60), allowNull: true },
  moneda: { type: DataTypes.ENUM('PEN', 'USD'), allowNull: false, defaultValue: 'PEN' },
  tipo_cambio: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1 },
  costos_adicionales: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  estado: { type: DataTypes.ENUM('borrador', 'recibida', 'anulada'), allowNull: false, defaultValue: 'recibida' },
  notas: { type: DataTypes.TEXT, allowNull: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'compras', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
