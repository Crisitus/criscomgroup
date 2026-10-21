const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('AffiliateSettlement', {
  id_settlement: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: false },
  periodo: { type: DataTypes.STRING(7), allowNull: false },
  facturacion_valida: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 8 },
  monto_comision: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  vence_en: { type: DataTypes.DATE, allowNull: false },
  estado: { type: DataTypes.ENUM('pendiente', 'pagado', 'vencido', 'anulado'), allowNull: false, defaultValue: 'pendiente' },
  pagado_en: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'affiliate_settlements', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en', indexes: [{ unique: true, fields: ['affiliate_business_id', 'periodo'] }] });
