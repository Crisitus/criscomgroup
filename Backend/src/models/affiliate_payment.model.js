const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('AffiliatePayment', {
  id_affiliate_payment: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  settlement_id: { type: DataTypes.INTEGER, allowNull: false },
  monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  metodo: { type: DataTypes.ENUM('tarjeta', 'transferencia', 'efectivo', 'otro'), allowNull: false },
  referencia: { type: DataTypes.STRING(120), allowNull: false },
  idempotency_key: { type: DataTypes.STRING(120), allowNull: true, unique: true },
  comprobante_url: { type: DataTypes.STRING(255), allowNull: true },
  estado: { type: DataTypes.ENUM('pendiente', 'validado', 'rechazado'), allowNull: false, defaultValue: 'pendiente' },
  registrado_por: { type: DataTypes.INTEGER, allowNull: false },
  validado_por: { type: DataTypes.INTEGER, allowNull: true },
  validado_en: { type: DataTypes.DATE, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'affiliate_payments', timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
