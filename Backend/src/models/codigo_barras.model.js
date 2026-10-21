const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CodigoBarras = sequelize.define('CodigoBarras', {
  id_codigo_barras: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo_barras: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id_producto'
    }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  fecha_ingreso: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'codigos_barras',
  timestamps: false
});

module.exports = CodigoBarras;