'use strict';
// Uso: node src/scripts/reconcile-ofertas.js  (idempotente)
const { sequelize } = require('../models');
const { reconciliarOfertas } = require('../services/ofertas.service');

reconciliarOfertas()
  .then((r) => { console.log('Reconciliacion de ofertas:', JSON.stringify(r)); return sequelize.close(); })
  .catch((e) => { console.error('Error reconciliando ofertas:', e); process.exit(1); });
