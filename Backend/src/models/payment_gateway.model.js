const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentGateway = sequelize.define('PaymentGateway', {
  id_gateway: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  provider: { type: DataTypes.ENUM('niubiz', 'vendemas', 'culqi', 'openpay', 'izipay'), allowNull: false, unique: true },
  mode: { type: DataTypes.ENUM('test', 'production'), allowNull: false, defaultValue: 'test' },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  credentials_encrypted: { type: DataTypes.TEXT('long'), allowNull: true },
  connection_status: { type: DataTypes.ENUM('not_configured', 'saved', 'connected', 'error', 'contract_required'), allowNull: false, defaultValue: 'not_configured' },
  connection_message: { type: DataTypes.STRING(500), allowNull: true },
  last_checked_at: { type: DataTypes.DATE, allowNull: true },
  updated_by: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'payment_gateways', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = PaymentGateway;
