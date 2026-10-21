const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define(
  "OrdenServicioEvidencia",
  {
    id_evidencia_servicio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
    // STRING (no ENUM) para poder extender etapas sin ALTER de enum, igual que
    // `ordenes_servicio_eventos.tipo`. Valores usados: recepcion, diagnostico,
    // reparacion, pruebas, entrega, otro, firma_recepcion, firma_garantia.
    etapa: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    // Valores: imagen, audio, documento, firma.
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    nombre_original: { type: DataTypes.STRING(255), allowNull: false },
    nombre_archivo: { type: DataTypes.STRING(255), allowNull: false },
    mime: { type: DataTypes.STRING(100), allowNull: false },
    tamano: { type: DataTypes.INTEGER, allowNull: false },
    descripcion: { type: DataTypes.STRING(255), allowNull: true },
    // Metadatos de firma (solo para etapas firma_recepcion/firma_garantia).
    firmante_nombre: { type: DataTypes.STRING(160), allowNull: true },
    firmante_dni: { type: DataTypes.STRING(20), allowNull: true },
    hash_sha256: { type: DataTypes.STRING(64), allowNull: true },
    origen: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "erp",
    },
    visible_cliente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    publicada_por: { type: DataTypes.INTEGER, allowNull: true },
    publicada_en: { type: DataTypes.DATE, allowNull: true },
    subida_por: { type: DataTypes.INTEGER, allowNull: false },
    eliminada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    eliminada_por: { type: DataTypes.INTEGER, allowNull: true },
    eliminada_en: { type: DataTypes.DATE, allowNull: true },
    eliminacion_motivo: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: "ordenes_servicio_evidencias",
    createdAt: "creado_en",
    updatedAt: false,
    indexes: [{ fields: ["id_orden_servicio", "etapa", "eliminada"] }],
  },
);
