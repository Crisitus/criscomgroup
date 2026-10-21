const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('InventarioUbicacion', {
  id_ubicacion_inventario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  negocio_clave: { type: DataTypes.STRING(80), allowNull: false },
  codigo: { type: DataTypes.STRING(40), allowNull: false },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  tipo: { type: DataTypes.ENUM('almacen', 'tienda', 'taller', 'transito', 'virtual'), allowNull: false, defaultValue: 'almacen' },
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inventario_ubicaciones', createdAt: 'creado_en', updatedAt: 'actualizado_en',
  indexes: [{ unique: true, fields: ['negocio_clave', 'codigo'] }],
});
