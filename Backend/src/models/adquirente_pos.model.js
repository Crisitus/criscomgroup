const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Adquirente/POS configurable (multibanco): BBVA, Culqi POS, Niubiz, Izipay, etc.
// Es SOLO configuración del terminal físico; el cobro lo hace el POS del banco y
// aquí se registra la operación (voucher). Diseñado para, más adelante, colgar
// una integración por SDK por adquirente sin cambiar el modelo de datos.
module.exports = sequelize.define('AdquirentePos', {
  id_adquirente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(60), allowNull: false },            // "BBVA", "Culqi POS", "Niubiz", "Izipay"
  marca: { type: DataTypes.STRING(40), allowNull: true },              // red/marca visible (Visa/Mastercard/multired)
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  predeterminado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  canales: { type: DataTypes.JSON, allowNull: true },
  modo_confirmacion: { type: DataTypes.ENUM('manual', 'api'), allowNull: false, defaultValue: 'manual' },
  link_pago_url: { type: DataTypes.STRING(500), allowNull: true },
  requiere_referencia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // exigir N° de operación del voucher
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'adquirentes_pos', createdAt: 'creado_en', updatedAt: 'actualizado_en' });
