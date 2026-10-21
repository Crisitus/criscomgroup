const { sequelize } = require('../config/database');

// Constraints de integridad de stock (auditoria 2026-10-12): la validacion
// Sequelize min:0 vive solo en la aplicacion; estos CHECK protegen la base
// ante cualquier escritura. Si hay negativos historicos NO se crean y se
// reporta. Tambien elimina el indice unico duplicado de codigos_barras.
const ensureInventoryConstraints = async () => {
  const [negProductos] = await sequelize.query('SELECT COUNT(*) AS c FROM productos WHERE stock < 0');
  const [negBarcodes] = await sequelize.query('SELECT COUNT(*) AS c FROM codigos_barras WHERE cantidad < 0');

  const [checks] = await sequelize.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'CHECK' AND TABLE_NAME IN ('productos', 'codigos_barras')"
  );
  const existentes = new Set(checks.map(c => c.CONSTRAINT_NAME));

  if (Number(negProductos[0].c) || Number(negBarcodes[0].c)) {
    console.error(`[ensure-inventory] Hay stock negativo historico (productos: ${negProductos[0].c}, codigos_barras: ${negBarcodes[0].c}); no se crean los CHECK hasta corregirlo`);
  } else {
    if (!existentes.has('chk_productos_stock_nonneg')) {
      await sequelize.query('ALTER TABLE productos ADD CONSTRAINT chk_productos_stock_nonneg CHECK (stock >= 0)');
    }
    if (!existentes.has('chk_codigos_barras_cantidad_nonneg')) {
      await sequelize.query('ALTER TABLE codigos_barras ADD CONSTRAINT chk_codigos_barras_cantidad_nonneg CHECK (cantidad >= 0)');
    }
  }

  const [duplicado] = await sequelize.query("SHOW INDEX FROM codigos_barras WHERE Key_name = 'codigo_barras_2'");
  if (duplicado.length) {
    await sequelize.query('ALTER TABLE codigos_barras DROP INDEX codigo_barras_2');
  }
};

module.exports = { ensureInventoryConstraints };
