const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// Historial de cambios de estado y de cotización de las solicitudes de ensamble.
const SolicitudEnsambleHistorial = sequelize.define("SolicitudEnsambleHistorial", {
  id_historial: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  accion: { type: DataTypes.STRING(30), allowNull: false },
  de: { type: DataTypes.STRING(30), allowNull: true },
  a: { type: DataTypes.STRING(30), allowNull: true },
  monto_anterior: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  monto_nuevo: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  nota: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "solicitud_ensamble_historial",
  createdAt: "creado",
  updatedAt: false,
  underscored: true,
});

module.exports = SolicitudEnsambleHistorial;
