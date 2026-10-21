const { sequelize } = require('../config/database');

async function ensureColumns(table, columns) {
  const [existing] = await sequelize.query(`SHOW COLUMNS FROM ${table}`);
  const names = new Set(existing.map(column => column.Field));
  for (const [name, definition] of Object.entries(columns)) {
    if (!names.has(name)) await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

// Usuarios: baja logica (activo) y version de sesion (token_version) para
// invalidar los JWT emitidos antes de un cambio de clave, rol o desactivacion.
async function ensureAdminUsersSchema() {
  await ensureColumns('users', {
    activo: 'TINYINT(1) NOT NULL DEFAULT 1',
    token_version: 'INT NOT NULL DEFAULT 0',
    password_changed_at: 'DATETIME NULL',
  });
}

module.exports = { ensureAdminUsersSchema };
