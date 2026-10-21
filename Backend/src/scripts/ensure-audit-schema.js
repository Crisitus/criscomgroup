const { sequelize } = require('../config/database');

const COLUMNS = {
  registro_ref: 'VARCHAR(64) NULL',
  estado_http: 'SMALLINT NULL',
  usuario_nombre: 'VARCHAR(150) NULL',
  usuario_email: 'VARCHAR(180) NULL',
  usuario_rol: 'INT NULL',
};

// Los nombres coinciden con los del modelo para que sync() no duplique indices.
const INDEXES = {
  idx_audit_fecha: '(fecha_hora)',
  idx_audit_tabla_registro: '(tabla, registro_id)',
  idx_audit_accion_fecha: '(accion, fecha_hora)',
  idx_audit_tabla_fecha: '(tabla, fecha_hora)',
  idx_audit_usuario_fecha: '(usuario_id, fecha_hora)',
};

// Idempotente: seguro de ejecutar en cada arranque.
async function ensureAuditSchema() {
  if (sequelize.getDialect() !== 'mysql') return;
  const [cols] = await sequelize.query('SHOW COLUMNS FROM audit_logs');
  const names = new Set(cols.map((c) => c.Field));
  for (const [name, definition] of Object.entries(COLUMNS)) {
    if (!names.has(name)) await sequelize.query(`ALTER TABLE audit_logs ADD COLUMN ${name} ${definition}`);
  }
  const [idx] = await sequelize.query('SHOW INDEX FROM audit_logs');
  const have = new Set(idx.map((i) => i.Key_name));
  for (const [name, def] of Object.entries(INDEXES)) {
    if (!have.has(name)) await sequelize.query(`CREATE INDEX ${name} ON audit_logs ${def}`);
  }
}

module.exports = { ensureAuditSchema };
