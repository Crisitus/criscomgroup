const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('OrdenServicioDiagnostico', {
  id_diagnostico_asistido: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
  version: { type: DataTypes.INTEGER, allowNull: false },
  sintomas: { type: DataTypes.TEXT, allowNull: false },
  pruebas: { type: DataTypes.JSON, allowNull: true },
  resultado: { type: DataTypes.JSON, allowNull: false },
  motor: { type: DataTypes.STRING(60), allowNull: false },
  estado: { type: DataTypes.ENUM('borrador', 'aceptado', 'rechazado', 'reemplazado'), allowNull: false, defaultValue: 'borrador' },
  diagnostico_final: { type: DataTypes.TEXT, allowNull: true },
  entrada_hash: { type: DataTypes.STRING(64), allowNull: false },
  prompt_version: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pc-v1' },
  revision_nota: { type: DataTypes.TEXT, allowNull: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
  revisado_por: { type: DataTypes.INTEGER, allowNull: true },
  revisado_en: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'ordenes_servicio_diagnosticos', createdAt: 'creado_en', updatedAt: 'actualizado_en', indexes: [{ unique: true, fields: ['id_orden_servicio', 'version'] }] });
