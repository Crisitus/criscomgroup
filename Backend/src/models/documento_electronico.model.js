const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('DocumentoElectronico', {
  id_documento: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  venta_id: { type: DataTypes.INTEGER, allowNull: true },
  id_pedido: { type: DataTypes.INTEGER, allowNull: true },
  id_company_emisor: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.ENUM('01', '03', '07', '08'), allowNull: false },
  serie: { type: DataTypes.STRING(4), allowNull: false },
  correlativo: { type: DataTypes.INTEGER, allowNull: false },
  estado: { type: DataTypes.ENUM('pendiente', 'firmado', 'enviado', 'aceptado', 'rechazado', 'error'), allowNull: false, defaultValue: 'pendiente' },
  hash_xml: { type: DataTypes.STRING(128), allowNull: true },
  xml_path: { type: DataTypes.STRING(255), allowNull: true },
  cdr_path: { type: DataTypes.STRING(255), allowNull: true },
  pdf_path: { type: DataTypes.STRING(255), allowNull: true },
  codigo_respuesta: { type: DataTypes.STRING(20), allowNull: true },
  mensaje_respuesta: { type: DataTypes.TEXT, allowNull: true },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'documentos_electronicos', createdAt: 'creado_en', updatedAt: 'actualizado_en', indexes: [{ name: 'documento_emisor_numero_unique', unique: true, fields: ['id_company_emisor', 'tipo', 'serie', 'correlativo'] }] });
