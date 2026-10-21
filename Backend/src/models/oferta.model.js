// src/models/oferta.model.js
module.exports = (sequelize, DataTypes) => {
  const Oferta = sequelize.define('Oferta', {
    id_oferta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_producto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'productos',
        key: 'id_producto'
      },
      onDelete: 'CASCADE'
    },
    descuento: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0.01,
        max: 99.99
      }
    },
    // Vigencia opcional: NULL = sin límite. Oferta vigente cuando
    // (vigente_desde IS NULL o <= ahora) y (vigente_hasta IS NULL o >= ahora).
    vigente_desde: {
      type: DataTypes.DATE,
      allowNull: true
    },
    vigente_hasta: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'ofertas',
    timestamps: true,
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  });

  Oferta.associate = function(models) {
    Oferta.belongsTo(models.Producto, { foreignKey: 'id_producto', as: 'producto' });
  };

  return Oferta;
};
