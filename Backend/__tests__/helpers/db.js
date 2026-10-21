'use strict';
const { sequelize, seedRoles } = require('../../src/models');

/**
 * Inicializa la DB de test: sync force + seed de roles.
 * SAFETY CHECK: lanza error si DB_NAME no contiene "test".
 */
const setupTestDb = async () => {
  if (!process.env.DB_NAME || !process.env.DB_NAME.includes('test')) {
    throw new Error(
      'SAFETY CHECK: DB_NAME no contiene "test". No se ejecutará sync({ force: true }) en una DB de producción.'
    );
  }
  await sequelize.sync({ force: true });
  await seedRoles();
};

module.exports = { setupTestDb, sequelize };
