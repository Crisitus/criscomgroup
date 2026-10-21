const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Contador atomico de correlativos por clave de serie (POS:NV01, POS:F001, ...).
// La asignacion se hace con INSERT ... ON DUPLICATE KEY UPDATE dentro de la
// transaccion de la venta: la fila queda bloqueada hasta el commit y dos ventas
// concurrentes nunca reciben el mismo numero.
const SerieComprobante = sequelize.define('SerieComprobante', {
  clave: {
    type: DataTypes.STRING(80),
    primaryKey: true
  },
  ultimo_correlativo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'series_comprobantes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SerieComprobante;
