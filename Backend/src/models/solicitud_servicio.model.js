const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('SolicitudServicio', {
  id_solicitud_servicio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  cliente: { type: DataTypes.STRING(180), allowNull: false },
  telefono: { type: DataTypes.STRING(40), allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: true },
  tipo_equipo: { type: DataTypes.STRING(60), allowNull: false },
  marca_modelo: { type: DataTypes.STRING(180), allowNull: true },
  falla: { type: DataTypes.TEXT, allowNull: false },
  disponibilidad: { type: DataTypes.STRING(120), allowNull: true },
  consentimiento_contacto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  consentimiento_contacto_en: { type: DataTypes.DATE, allowNull: true },
  estado: { type: DataTypes.ENUM('pendiente', 'contactado', 'recibido', 'descartado'), allowNull: false, defaultValue: 'pendiente' },
  id_orden_servicio: { type: DataTypes.INTEGER, allowNull: true },
  notas_admin: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'solicitudes_servicio', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
