const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Pago', {
  id_pago: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_pedido: { type: DataTypes.INTEGER, allowNull: false },
  proveedor: { type: DataTypes.ENUM('culqi', 'manual'), allowNull: false },
  proveedor_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
  idempotency_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  monto_centimos: { type: DataTypes.INTEGER, allowNull: false },
  moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'PEN' },
  estado: { type: DataTypes.ENUM('creado', 'pagado', 'fallido', 'devuelto'), allowNull: false, defaultValue: 'creado' },
  respuesta_segura: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'pagos', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
