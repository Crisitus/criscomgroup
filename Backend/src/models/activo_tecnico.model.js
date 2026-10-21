const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ActivoTecnico', {
  id_activo_tecnico: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_cliente_servicio: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(60), allowNull: false },
  marca: { type: DataTypes.STRING(80), allowNull: true },
  modelo: { type: DataTypes.STRING(120), allowNull: true },
  numero_serie: { type: DataTypes.STRING(120), allowNull: true },
  imei: { type: DataTypes.STRING(32), allowNull: true },
  color: { type: DataTypes.STRING(40), allowNull: true },
  alias: { type: DataTypes.STRING(120), allowNull: true },
  notas: { type: DataTypes.TEXT, allowNull: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
  negocio_clave: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'central' },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'activos_tecnicos',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
  indexes: [
    { fields: ['affiliate_business_id', 'id_cliente_servicio'] },
    { unique: true, fields: ['negocio_clave', 'numero_serie'] },
    { unique: true, fields: ['negocio_clave', 'imei'] },
  ],
});
