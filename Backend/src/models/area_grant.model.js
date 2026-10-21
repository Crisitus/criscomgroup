const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('AreaGrant', {
  id_grant: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, user_id: { type: DataTypes.INTEGER, allowNull: false }, area: { type: DataTypes.STRING(40), allowNull: false }, expires_at: { type: DataTypes.DATE, allowNull: true }, granted_by: { type: DataTypes.INTEGER, allowNull: false }, active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'area_grants', createdAt: 'created_at', updatedAt: 'updated_at', indexes: [{ unique: true, fields: ['user_id', 'area'] }] });
