const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define(
  "OrdenServicioCotizacion",
  {
    id_cotizacion_servicio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false },
    moneda: { type: DataTypes.ENUM("PEN", "USD"), allowNull: false },
    repuestos: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    mano_obra: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    descuento: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    recargo: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    diagnostico: { type: DataTypes.TEXT, allowNull: true },
    trabajo_propuesto: { type: DataTypes.TEXT, allowNull: true },
    condiciones: { type: DataTypes.TEXT, allowNull: true },
    estado: {
      type: DataTypes.ENUM(
        "borrador",
        "enviada",
        "aprobada",
        "rechazada",
        "reemplazada",
      ),
      allowNull: false,
      defaultValue: "borrador",
    },
    enviada_en: { type: DataTypes.DATE, allowNull: true },
    resuelta_en: { type: DataTypes.DATE, allowNull: true },
    aprobador_nombre: { type: DataTypes.STRING(180), allowNull: true },
    canal_respuesta: {
      type: DataTypes.ENUM("presencial", "whatsapp", "correo", "web", "otro"),
      allowNull: true,
    },
    evidencia_consentimiento: { type: DataTypes.STRING(255), allowNull: true },
    creada_por: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "ordenes_servicio_cotizaciones",
    createdAt: "creada_en",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["id_orden_servicio", "version"] }],
  },
);
