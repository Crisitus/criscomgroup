const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('CotizacionDetalle', {
  id_cotizacion_detalle: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cotizacion_id: { type: DataTypes.INTEGER, allowNull: false },
  producto_id: { type: DataTypes.INTEGER, allowNull: true },
  descripcion: { type: DataTypes.STRING(255), allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  costo_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: 'cotizacion_detalles_comerciales', timestamps: false });
