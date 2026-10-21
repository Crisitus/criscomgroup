const { sequelize } = require('../config/database');

const columns = {
  tipo_componente: "VARCHAR(50) NOT NULL DEFAULT 'equipo_completo'",
  capacidad: 'VARCHAR(80) NULL',
  smart_salud_porcentaje: 'DECIMAL(5,2) NULL',
  tbw_escrito: 'DECIMAL(12,2) NULL',
  tbw_nominal: 'DECIMAL(12,2) NULL',
  horas_encendido: 'INT NULL',
  ciclos_encendido: 'INT NULL',
  ciclos_bateria: 'INT NULL',
  capacidad_bateria_diseno: 'INT NULL',
  capacidad_bateria_actual: 'INT NULL',
  prueba_funcional: "ENUM('pendiente','aprobado','observado','rechazado') NOT NULL DEFAULT 'pendiente'",
  grado_evaluacion: "ENUM('A','B','C','D','defectuoso') NULL",
  puntaje_evaluacion: 'DECIMAL(5,2) NULL',
  observaciones_tecnicas: 'TEXT NULL',
  evaluacion_detalle: 'JSON NULL',
};

const ensureAcquisitionSchema = async () => {
  const [tables] = await sequelize.query("SHOW TABLES LIKE 'adquisiciones_usados'");
  if (!tables.length) return;
  const [existing] = await sequelize.query('SHOW COLUMNS FROM adquisiciones_usados');
  const names = new Set(existing.map(column => column.Field));
  for (const [name, definition] of Object.entries(columns)) {
    if (!names.has(name)) await sequelize.query(`ALTER TABLE adquisiciones_usados ADD COLUMN ${name} ${definition}`);
  }
};

module.exports = { ensureAcquisitionSchema };
