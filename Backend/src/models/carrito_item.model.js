const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarritoItem = sequelize.define('CarritoItem', {
  id_carrito_item: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false },
  id_producto: { type: DataTypes.INTEGER, allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1, max: 999 } },
}, {
  tableName: 'carrito_items', timestamps: true,
  createdAt: 'creado_en', updatedAt: 'actualizado_en',
  indexes: [{ unique: true, fields: ['id_usuario', 'id_producto'] }],
});

module.exports = CarritoItem;
