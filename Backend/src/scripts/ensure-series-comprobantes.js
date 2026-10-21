const { sequelize } = require('../config/database');

// Crea la tabla de contadores de correlativos, siembra el maximo vigente por
// serie del POS y agrega UNIQUE(serie, correlativo) en ventas como red de
// seguridad. Si encuentra duplicados historicos NO crea el indice y lo reporta.
const ensureSeriesComprobantes = async () => {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS series_comprobantes (
    clave VARCHAR(80) NOT NULL PRIMARY KEY,
    ultimo_correlativo INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`);

  const [maximos] = await sequelize.query(
    'SELECT serie, MAX(correlativo) AS maximo FROM ventas WHERE serie IS NOT NULL AND correlativo IS NOT NULL GROUP BY serie'
  );
  for (const fila of maximos) {
    await sequelize.query(
      'INSERT INTO series_comprobantes (clave, ultimo_correlativo, created_at, updated_at) VALUES (?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE ultimo_correlativo = GREATEST(ultimo_correlativo, VALUES(ultimo_correlativo))',
      { replacements: [`POS:${fila.serie}`, Number(fila.maximo)] }
    );
  }

  const [duplicados] = await sequelize.query(
    'SELECT serie, correlativo, COUNT(*) AS c FROM ventas WHERE serie IS NOT NULL AND correlativo IS NOT NULL GROUP BY serie, correlativo HAVING c > 1'
  );
  if (duplicados.length) {
    console.error(`[ensure-series] NO se crea UNIQUE(serie, correlativo): hay ${duplicados.length} duplicados historicos en ventas`, duplicados.slice(0, 5));
    return;
  }
  const [indices] = await sequelize.query("SHOW INDEX FROM ventas WHERE Key_name = 'ventas_serie_correlativo_unique'");
  if (!indices.length) {
    await sequelize.query('ALTER TABLE ventas ADD UNIQUE KEY ventas_serie_correlativo_unique (serie, correlativo)');
  }

  // M5: clave de idempotencia del POS (un reintento de red no duplica la venta)
  const [columna] = await sequelize.query("SHOW COLUMNS FROM ventas LIKE 'idempotency_key'");
  if (!columna.length) {
    await sequelize.query("ALTER TABLE ventas ADD COLUMN idempotency_key VARCHAR(64) NULL COMMENT 'Clave de idempotencia del POS'");
  }
  const [idxIdem] = await sequelize.query("SHOW INDEX FROM ventas WHERE Key_name = 'ventas_idempotencia_unique'");
  if (!idxIdem.length) {
    await sequelize.query('ALTER TABLE ventas ADD UNIQUE KEY ventas_idempotencia_unique (idempotency_key)');
  }
};

module.exports = { ensureSeriesComprobantes };
