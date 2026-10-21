const { Sequelize } = require('sequelize');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'mysql';
const isSqlite = dialect === 'sqlite';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect,
    // Solo aplica cuando DB_DIALECT=sqlite (desarrollo local sin MySQL).
    storage: process.env.DB_STORAGE || './dev.sqlite',
    logging: false,
    // SQLite no soporta timezone personalizado ni typeCast de mysql2.
    ...(isSqlite ? {} : {
      timezone: '-05:00', // Zona horaria de Perú (UTC-5)
      dialectOptions: {
        dateStrings: true,
        typeCast: function (field, next) {
          if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
            return field.string();
          }
          return next();
        }
      }
    }),
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const shouldSyncSchema = (mode, tableNames) => {
  const normalizedMode = String(mode || 'auto').trim().toLowerCase();
  if (normalizedMode === 'always') return true;
  if (normalizedMode === 'never') return false;
  if (normalizedMode !== 'auto') throw new Error('DB_SYNC_ON_START debe ser auto, always o never');
  const tables = new Set((tableNames || []).map(name => String(name).toLowerCase()));
  return !tables.has('users') || !tables.has('roles');
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexión a la base de datos exitosa");

    const tableNames = await sequelize.getQueryInterface().showAllTables();
    if (shouldSyncSchema(process.env.DB_SYNC_ON_START, tableNames)) {
      await sequelize.sync();
      console.log("Base de datos sincronizada");
    } else {
      console.log("Sincronización global omitida: esquema base existente");
    }
  } catch (error) {
    console.error("Error de conexión a la base de datos:", error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB,
  shouldSyncSchema,
};
