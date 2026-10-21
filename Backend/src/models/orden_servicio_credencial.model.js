const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('OrdenServicioCredencial', {
  id_credencial_servicio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  secreto_cifrado: { type: DataTypes.TEXT, allowNull: false },
  iv: { type: DataTypes.STRING(32), allowNull: false },
  auth_tag: { type: DataTypes.STRING(32), allowNull: false },
  tipo: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'desbloqueo' },
  expira_en: { type: DataTypes.DATE, allowNull: false },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
  consultado_por: { type: DataTypes.INTEGER, allowNull: true },
  consultado_en: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'ordenes_servicio_credenciales', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
