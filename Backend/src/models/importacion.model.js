const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Importacion', {
  id_importacion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  producto_id: { type: DataTypes.INTEGER, allowNull: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  tipo_cambio: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 1 },
  inventario_registrado_en: { type: DataTypes.DATE, allowNull: true },
  referencia: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  proveedor: { type: DataTypes.STRING(180), allowNull: false },
  pais_origen: { type: DataTypes.STRING(80), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  tracking: { type: DataTypes.STRING(120), allowNull: true },
  regimen_aduanero: { type: DataTypes.STRING(100), allowNull: true },
  moneda: { type: DataTypes.ENUM('USD', 'PEN', 'EUR'), allowNull: false, defaultValue: 'USD' },
  costo_mercancia: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  flete: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  seguro: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  tributos: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  otros_costos: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  estado: { type: DataTypes.ENUM('planificada', 'en_transito', 'en_aduanas', 'liberada', 'recibida', 'cancelada'), allowNull: false, defaultValue: 'planificada' },
  fecha_embarque: { type: DataTypes.DATEONLY, allowNull: true },
  fecha_llegada_estimada: { type: DataTypes.DATEONLY, allowNull: true },
  dam_dua: { type: DataTypes.STRING(100), allowNull: true },
  notas_contables: { type: DataTypes.TEXT, allowNull: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'importaciones', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
