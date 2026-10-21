const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('Proveedor', {
  id_proveedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  razon_social: { type: DataTypes.STRING(180), allowNull: false },
  ruc_documento: { type: DataTypes.STRING(20), allowNull: true },
  contacto: { type: DataTypes.STRING(120), allowNull: true },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: true },
  direccion: { type: DataTypes.STRING(255), allowNull: true },
  ciudad: { type: DataTypes.STRING(80), allowNull: true },
  dias_credito: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'proveedores', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
