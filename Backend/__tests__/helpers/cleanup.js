'use strict';
const { sequelize, seedRoles } = require('../../src/models');

/**
 * Limpia la DB de test haciendo sync force y re-sembrando roles.
 * SAFETY CHECK: lanza error si DB_NAME no contiene "test".
 */
const truncateAll = async () => {
  if (!process.env.DB_NAME || !process.env.DB_NAME.includes('test')) {
    throw new Error(
      'SAFETY CHECK: DB_NAME no contiene "test". Operación de limpieza cancelada.'
    );
  }
  await sequelize.sync({ force: true });
  await seedRoles();
};

module.exports = { truncateAll };
