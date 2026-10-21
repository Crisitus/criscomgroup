const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SolicitudPostventa = sequelize.define("SolicitudPostventa", {
  id_solicitud: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo_seguimiento: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, validate: { isEmail: true } },
  telefono: { type: DataTypes.STRING(30), allowNull: true },
  numero_pedido: { type: DataTypes.STRING(80), allowNull: false },
  tipo: { type: DataTypes.ENUM("cambio", "devolucion", "garantia"), allowNull: false },
  producto_servicio: { type: DataTypes.STRING(220), allowNull: false },
  motivo: { type: DataTypes.STRING(180), allowNull: false },
  detalle: { type: DataTypes.TEXT, allowNull: false },
  solucion_solicitada: { type: DataTypes.TEXT, allowNull: false },
  estado: {
    type: DataTypes.ENUM("recibida", "en_revision", "esperando_cliente", "aprobada", "rechazada", "resuelta"),
    allowNull: false,
    defaultValue: "recibida",
  },
  notas_admin: { type: DataTypes.TEXT, allowNull: true },
  respuesta_cliente: { type: DataTypes.TEXT, allowNull: true },
  pedido_id: { type: DataTypes.INTEGER, allowNull: true },
  venta_id: { type: DataTypes.INTEGER, allowNull: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  vinculado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  fuera_de_plazo: { type: DataTypes.BOOLEAN, allowNull: true },
  accion_posterior: { type: DataTypes.STRING(30), allowNull: true },
  accion_posterior_nota: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "solicitudes_postventa",
  createdAt: "fecha_creacion",
  updatedAt: "fecha_actualizacion",
});

module.exports = SolicitudPostventa;
