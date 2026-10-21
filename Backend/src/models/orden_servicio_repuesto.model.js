const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define(
  "OrdenServicioRepuesto",
  {
    id_repuesto_servicio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_orden_servicio: { type: DataTypes.INTEGER, allowNull: false },
    id_producto: { type: DataTypes.INTEGER, allowNull: true },
    sku: { type: DataTypes.STRING(50), allowNull: true },
    descripcion: { type: DataTypes.STRING(180), allowNull: false },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    costo_unitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    precio_unitario: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    estado_stock: {
      type: DataTypes.ENUM("no_aplica", "reservado", "consumido", "devuelto"),
      allowNull: false,
      defaultValue: "no_aplica",
    },
    registrado_por: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "ordenes_servicio_repuestos",
    createdAt: "creado_en",
    updatedAt: "actualizado_en",
    indexes: [
      { fields: ["id_orden_servicio", "estado_stock"] },
      { fields: ["id_producto"] },
    ],
  },
);
