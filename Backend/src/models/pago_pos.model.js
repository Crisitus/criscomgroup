const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('PagoPos', {
  id_pago_pos: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  venta_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  id_adquirente: { type: DataTypes.INTEGER, allowNull: false },
  canal: { type: DataTypes.ENUM('pos', 'qr', 'link'), allowNull: false },
  numero_operacion: { type: DataTypes.STRING(80), allowNull: false },
  monto_centimos: { type: DataTypes.INTEGER, allowNull: false },
  moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'PEN' },
  estado: { type: DataTypes.ENUM('pendiente_confirmacion', 'confirmado', 'anulado'), allowNull: false, defaultValue: 'pendiente_confirmacion' },
  registrado_por: { type: DataTypes.INTEGER, allowNull: false },
  confirmado_por: { type: DataTypes.INTEGER, allowNull: true },
  confirmado_en: { type: DataTypes.DATE, allowNull: true },
  ultimos_cuatro: { type: DataTypes.STRING(4), allowNull: true },
  marca_tarjeta: { type: DataTypes.STRING(30), allowNull: true },
}, {
  tableName: 'pagos_pos', createdAt: 'creado_en', updatedAt: 'actualizado_en',
  indexes: [{ unique: true, fields: ['id_adquirente', 'numero_operacion'], name: 'pago_pos_adquirente_operacion_unique' }],
});
