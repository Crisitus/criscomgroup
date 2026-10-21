const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ESTADOS = ["pendiente", "en_proceso", "respondido", "archivado"];
const TIPOS = ["reclamo", "queja"];
const TIPOS_BIEN = ["producto", "servicio"];

// Las columnas nuevas son nulables a nivel de BD para que el ALTER sobre una tabla
// con filas antiguas sea seguro; el servicio siempre las completa al registrar.
const LibroReclamaciones = sequelize.define("LibroReclamaciones", {
  id_reclamo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(20), allowNull: true, unique: true },
  tipo: { type: DataTypes.ENUM(...TIPOS), allowNull: true },
  nombre: { type: DataTypes.STRING(160), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  documento: { type: DataTypes.STRING(20), allowNull: true },
  domicilio: { type: DataTypes.STRING(255), allowNull: true },
  es_menor: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  apoderado: { type: DataTypes.STRING(160), allowNull: true },
  tipo_bien: { type: DataTypes.ENUM(...TIPOS_BIEN), allowNull: true },
  bien: { type: DataTypes.STRING(255), allowNull: true },
  monto: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  pedido: { type: DataTypes.TEXT, allowNull: true },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: true },
  estado: { type: DataTypes.ENUM(...ESTADOS), allowNull: false, defaultValue: "pendiente" },
  respuesta: { type: DataTypes.TEXT, allowNull: true },
  fecha_respuesta: { type: DataTypes.DATE, allowNull: true },
  respondido_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "users", key: "id_user" },
  },
}, { tableName: "libro_reclamaciones" });

LibroReclamaciones.ESTADOS = ESTADOS;
LibroReclamaciones.TIPOS = TIPOS;
LibroReclamaciones.TIPOS_BIEN = TIPOS_BIEN;

module.exports = LibroReclamaciones;
