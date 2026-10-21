const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Banner = sequelize.define('Banner', {
  id_banner: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  imagen_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  media_type: {
    type: DataTypes.ENUM('image', 'video'),
    allowNull: false,
    defaultValue: 'image'
  },
  titulo: { type: DataTypes.STRING(120), allowNull: true },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Número de WhatsApp para contacto'
  },
  creado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  actualizado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'banner',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en'
});

module.exports = Banner;
