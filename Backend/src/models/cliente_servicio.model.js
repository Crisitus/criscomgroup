const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('ClienteServicio', {
  id_cliente_servicio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(180), allowNull: false },
  tipo_documento: { type: DataTypes.STRING(12), allowNull: true },
  documento: { type: DataTypes.STRING(30), allowNull: true },
  telefono: { type: DataTypes.STRING(40), allowNull: true },
  email: { type: DataTypes.STRING(160), allowNull: true },
  notas: { type: DataTypes.TEXT, allowNull: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
  negocio_clave: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'central' },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'clientes_servicio',
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
  indexes: [
    { fields: ['affiliate_business_id', 'nombre'] },
    { unique: true, fields: ['negocio_clave', 'documento'] },
    { fields: ['affiliate_business_id', 'telefono'] },
  ],
});
