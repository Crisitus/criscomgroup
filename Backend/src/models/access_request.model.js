const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('AccessRequest', {
  id_request: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, user_id: { type: DataTypes.INTEGER, allowNull: false }, area: { type: DataTypes.STRING(40), allowNull: false }, reason: { type: DataTypes.STRING(500), allowNull: false }, status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' }, reviewed_by: { type: DataTypes.INTEGER, allowNull: true }, reviewed_at: { type: DataTypes.DATE, allowNull: true }, expires_at: { type: DataTypes.DATE, allowNull: true }, review_note: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'access_requests', createdAt: 'created_at', updatedAt: 'updated_at' });
