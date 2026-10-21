'use strict';
const { sequelize } = require('../models');

/**
 * Asigna el siguiente correlativo de una serie de forma atomica.
 * INSERT ... ON DUPLICATE KEY UPDATE bloquea la fila dentro de la transaccion
 * llamadora: ventas concurrentes sobre la misma serie se serializan aqui y
 * reciben numeros distintos. Si la transaccion hace rollback el numero se
 * pierde (hueco aceptable: la numeracion SUNAT definitiva se asigna al emitir
 * en facturacion.controller, que conserva su propia numeracion por emisor).
 *
 * `base` solo se usa cuando la clave no existe aun (arranque en 1 por defecto);
 * en dev/prod el script ensure-series-comprobantes siembra el maximo vigente.
 */
const siguienteCorrelativo = async (clave, { transaction, base = 0 } = {}) => {
  if (!transaction) throw new Error('siguienteCorrelativo requiere una transaccion');
  await sequelize.query(
    'INSERT INTO series_comprobantes (clave, ultimo_correlativo, created_at, updated_at) VALUES (?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE ultimo_correlativo = ultimo_correlativo + 1',
    { replacements: [clave, Number(base) + 1], transaction }
  );
  const [rows] = await sequelize.query(
    'SELECT ultimo_correlativo FROM series_comprobantes WHERE clave = ?',
    { replacements: [clave], transaction }
  );
  return Number(rows[0].ultimo_correlativo);
};

module.exports = { siguienteCorrelativo };
