const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const DetalleVenta = sequelize.define('DetalleVenta', {
  detalle_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  venta_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ventas',
      key: 'venta_id'
    }
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'productos',
      key: 'id_producto'
    }
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1
    }
  },
  es_venta_mayorista: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Indica si se aplicó precio mayorista en este detalle"
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  precio_unitario_con_igv: { 
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  subtotal_con_igv: {  // Nuevo campo
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  condicion: {
    type: DataTypes.ENUM('nuevo', 'segunda_mano'),
    allowNull: false,
    defaultValue: 'nuevo'
  },
  garantia_meses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 12
  },
  estado_observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'detalle_ventas',
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: false
});


// En el método toJSON de los modelos
DetalleVenta.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  if (values.creado_en) {
    values.creado_en = moment(values.creado_en)
      .tz('America/Lima')
      .format('YYYY-MM-DD HH:mm:ss');
  }
  return values;
};

module.exports = DetalleVenta;
