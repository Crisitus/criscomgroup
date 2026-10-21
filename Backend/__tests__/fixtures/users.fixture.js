'use strict';

// Fixtures planos (sin persistir). Usar con createUser() del helper seed.
const gerente = {
  name: 'Gerente Test',
  email: 'gerente@test.local',
  password: 'Gerente123!',
  id_role: 1,
};

const vendedor = {
  name: 'Vendedor Test',
  email: 'vendedor@test.local',
  password: 'Vendedor123!',
  id_role: 3,
};

const admin = {
  name: 'Admin Test',
  email: 'admin@test.local',
  password: 'Admin123!',
  id_role: 2,
};

module.exports = { gerente, vendedor, admin };
