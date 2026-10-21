const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id_log: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Permitir nulos para acciones anónimas
      references: {
        model: "users",
        key: "id_user",
      },
    },
    accion: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    tabla: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    registro_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    registro_ref: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    datos_anteriores: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    datos_nuevos: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_cliente: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado_http: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    // Instantanea del autor: el registro no pierde quien actuo si se borra el usuario.
    usuario_nombre: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    usuario_email: {
      type: DataTypes.STRING(180),
      allowNull: true,
    },
    usuario_rol: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fecha_hora: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "audit_logs",
    timestamps: false,
    indexes: [
      { name: "idx_audit_fecha", fields: ["fecha_hora"] },
      { name: "idx_audit_tabla_registro", fields: ["tabla", "registro_id"] },
      { name: "idx_audit_accion_fecha", fields: ["accion", "fecha_hora"] },
      { name: "idx_audit_tabla_fecha", fields: ["tabla", "fecha_hora"] },
      { name: "idx_audit_usuario_fecha", fields: ["usuario_id", "fecha_hora"] },
    ],
  }
);

module.exports = AuditLog;