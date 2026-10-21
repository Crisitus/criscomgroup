const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define(
  "OrdenServicioCanalEvento",
  {
    id_canal_evento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
    proveedor: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "openclaw_whatsapp",
    },
    proveedor_mensaje_id: { type: DataTypes.STRING(191), allowNull: false },
    direccion: { type: DataTypes.STRING(12), allowNull: false },
    remitente_tipo: { type: DataTypes.STRING(20), allowNull: false },
    remitente_nombre: { type: DataTypes.STRING(120), allowNull: true },
    remitente_ultimos4: { type: DataTypes.STRING(4), allowNull: true },
    remitente_hash: { type: DataTypes.STRING(64), allowNull: true },
    contenido: { type: DataTypes.TEXT, allowNull: true },
    tipo_contenido: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "texto",
    },
    id_evidencia_servicio: { type: DataTypes.INTEGER, allowNull: true },
    recibido_en: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "ordenes_servicio_canal_eventos",
    createdAt: "creado_en",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["proveedor", "proveedor_mensaje_id"] },
      { fields: ["id_orden_servicio", "recibido_en"] },
    ],
  },
);
