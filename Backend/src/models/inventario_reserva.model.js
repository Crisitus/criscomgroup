const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('InventarioReserva', {
  id_reserva_inventario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quant_id: { type: DataTypes.INTEGER, allowNull: false },
  repuesto_servicio_id: { type: DataTypes.INTEGER, allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  estado: { type: DataTypes.ENUM('activa', 'consumida', 'liberada'), allowNull: false, defaultValue: 'activa' },
  creada_por: { type: DataTypes.INTEGER, allowNull: false },
  cerrada_por: { type: DataTypes.INTEGER, allowNull: true },
  cerrada_en: { type: DataTypes.DATE, allowNull: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'inventario_reservas', createdAt: 'creado_en', updatedAt: false,
  indexes: [{ unique: true, fields: ['quant_id', 'repuesto_servicio_id'] }, { fields: ['estado'] }],
});
