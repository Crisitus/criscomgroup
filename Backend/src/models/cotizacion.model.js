const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Cotizacion', {
  id_cotizacion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  numero: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  cliente_nombre: { type: DataTypes.STRING(150), allowNull: false },
  cliente_documento: { type: DataTypes.STRING(20), allowNull: true },
  cliente_email: { type: DataTypes.STRING(150), allowNull: true },
  cliente_telefono: { type: DataTypes.STRING(30), allowNull: true },
  escenario: { type: DataTypes.ENUM('economica', 'recomendada', 'premium', 'personalizada'), allowNull: false, defaultValue: 'personalizada' },
  vigencia_dias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  descuento: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  costo_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  margen: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  estado: { type: DataTypes.ENUM('borrador', 'enviada', 'aprobada', 'rechazada', 'vencida', 'convertida'), allowNull: false, defaultValue: 'borrador' },
  notas: { type: DataTypes.TEXT, allowNull: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'cotizaciones_comerciales', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
