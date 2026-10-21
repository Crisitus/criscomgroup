const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

const Categoria = sequelize.define(
  "Categoria",
  {
    id_categoria: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imagen_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "categorias",
    timestamps: true,
    createdAt: "creado_en",
    updatedAt: "actualizado_en",
  }
);

// En el método toJSON de los modelos
Categoria.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  if (values.creado_en) {
    values.creado_en = moment(values.creado_en)
      .tz("America/Lima")
      .format("YYYY-MM-DD HH:mm:ss");
  }
  if (values.actualizado_en) {
    values.actualizado_en = moment(values.actualizado_en)
      .tz("America/Lima")
      .format("YYYY-MM-DD HH:mm:ss");
  }
  return values;
};

module.exports = Categoria;
