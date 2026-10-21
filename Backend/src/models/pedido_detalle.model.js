const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('PedidoDetalle', {
  id_detalle: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_pedido: { type: DataTypes.INTEGER, allowNull: false },
  producto_id: { type: DataTypes.INTEGER, allowNull: false },
  producto_nombre: { type: DataTypes.STRING(150), allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario_con_igv: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  subtotal_con_igv: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  condicion: { type: DataTypes.ENUM('nuevo', 'segunda_mano'), allowNull: false },
  garantia_meses: { type: DataTypes.INTEGER, allowNull: false },
  estado_observaciones: { type: DataTypes.TEXT, allowNull: true },
  affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true },
  propietario_id: { type: DataTypes.INTEGER, allowNull: true },
  comision_porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
}, { tableName: 'pedido_detalles', timestamps: false });
