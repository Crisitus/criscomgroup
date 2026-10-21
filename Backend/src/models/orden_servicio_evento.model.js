const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('OrdenServicioEvento', {
  id_evento: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(40), allowNull: false },
  estado_anterior: { type: DataTypes.STRING(40), allowNull: true },
  estado_nuevo: { type: DataTypes.STRING(40), allowNull: true },
  detalle: { type: DataTypes.TEXT, allowNull: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'ordenes_servicio_eventos', createdAt: 'creado_en', updatedAt: false });
