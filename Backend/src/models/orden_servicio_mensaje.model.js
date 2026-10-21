const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('OrdenServicioMensaje', {
  id_mensaje_servicio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
  canal: { type: DataTypes.ENUM('whatsapp_manual'), allowNull: false, defaultValue: 'whatsapp_manual' },
  plantilla: { type: DataTypes.STRING(40), allowNull: false },
  plantilla_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  telefono_ultimos4: { type: DataTypes.STRING(4), allowNull: false },
  telefono_hash: { type: DataTypes.STRING(64), allowNull: false },
  contenido: { type: DataTypes.TEXT, allowNull: false },
  estado: { type: DataTypes.ENUM('preparado', 'abierto', 'cancelado'), allowNull: false, defaultValue: 'preparado' },
  consentimiento_fuente: { type: DataTypes.STRING(80), allowNull: false },
  preparado_por: { type: DataTypes.INTEGER, allowNull: false },
  abierto_en: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'ordenes_servicio_mensajes', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
