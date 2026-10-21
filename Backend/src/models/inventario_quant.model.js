const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('InventarioQuant', {
  id_quant_inventario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  producto_id: { type: DataTypes.INTEGER, allowNull: false },
  ubicacion_id: { type: DataTypes.INTEGER, allowNull: false },
  lote: { type: DataTypes.STRING(100), allowNull: true },
  numero_serie: { type: DataTypes.STRING(160), allowNull: true },
  condicion: { type: DataTypes.ENUM('nuevo', 'segunda_mano'), allowNull: false, defaultValue: 'nuevo' },
  identidad: { type: DataTypes.STRING(255), allowNull: false },
  disponible: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  reservado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inventario_quants', createdAt: 'creado_en', updatedAt: 'actualizado_en',
  indexes: [
    { unique: true, fields: ['producto_id', 'ubicacion_id', 'identidad'] },
    { unique: true, fields: ['producto_id', 'numero_serie'] },
    { fields: ['affiliate_business_id', 'producto_id'] },
  ],
});
