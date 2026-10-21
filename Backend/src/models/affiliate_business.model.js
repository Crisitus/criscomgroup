const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('AffiliateBusiness', {
  id_affiliate_business: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  owner_user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  nombre_comercial: { type: DataTypes.STRING(120), allowNull: false },
  logo_url: { type: DataTypes.STRING(255), allowNull: true },
  identidad_configurada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ruc: { type: DataTypes.STRING(11), allowNull: true },
  estado: { type: DataTypes.ENUM('activo', 'suspendido', 'cerrado'), allowNull: false, defaultValue: 'activo' },
  comision_porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 8 },
  prueba_inicia_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  prueba_finaliza_en: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'affiliate_businesses',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en',
  hooks: {
    beforeValidate: business => {
      if (!business.prueba_inicia_en) business.prueba_inicia_en = new Date();
      if (!business.prueba_finaliza_en) {
        const trialEnd = new Date(business.prueba_inicia_en);
        trialEnd.setMonth(trialEnd.getMonth() + 2);
        business.prueba_finaliza_en = trialEnd;
      }
    },
  },
});
