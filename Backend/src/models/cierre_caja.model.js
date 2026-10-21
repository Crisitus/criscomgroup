const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const moment = require('moment-timezone');

const CierreCaja = sequelize.define('CierreCaja', {
  id_cierre: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha_apertura: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_cierre: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cajero_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id_user'
    }
  },
  saldo_efectivo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  total_efectivo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  total_tarjeta: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  total_transferencia: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  total_yape: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  total_plin: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      isDecimal: true,
      min: 0
    }
  },
  cantidad_ventas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: true,
      min: 0
    }
  },
  estado: {
    type: DataTypes.ENUM('abierto', 'cerrado'),
    allowNull: false,
    defaultValue: 'abierto'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
  ,affiliate_business_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'cierres_caja',
  defaultScope: { where: { affiliate_business_id: null } },
  scopes: { allBusinesses: {} },
  timestamps: true,
  createdAt: 'creado_en',
  updatedAt: 'actualizado_en'
});

CierreCaja.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  // Solo convertir creado_en y actualizado_en
  if (values.creado_en) {
    values.creado_en = moment(values.creado_en)
      .tz('America/Lima')
      .format('YYYY-MM-DD HH:mm:ss');
  }
  if (values.actualizado_en) {
    values.actualizado_en = moment(values.actualizado_en)
      .tz('America/Lima')
      .format('YYYY-MM-DD HH:mm:ss');
  }
  return values;
};

module.exports = CierreCaja;
