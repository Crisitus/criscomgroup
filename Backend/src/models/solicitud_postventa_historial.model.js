const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SolicitudPostventaHistorial = sequelize.define("SolicitudPostventaHistorial", {
  id_historial: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  de: { type: DataTypes.STRING(30), allowNull: true },
  a: { type: DataTypes.STRING(30), allowNull: false },
  nota: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "postventa_historial",
  createdAt: "creado",
  updatedAt: false,
});

module.exports = SolicitudPostventaHistorial;
