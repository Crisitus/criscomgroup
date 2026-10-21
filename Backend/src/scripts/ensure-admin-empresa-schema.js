'use strict';
// Diagnostico de arranque del area Empresa/SUNAT/Pagos. NO escribe en la base de datos:
// solo avisa de configuraciones inconsistentes. Las correcciones son acciones explicitas
// (p. ej. POST /api/facturacion/emisores/bloquear-ruc20).
const { Op } = require('sequelize');
const Company = require('../models/company.model');
const sunat = require('../services/sunat.service');

const ensureAdminEmpresaSchema = async () => {
  const info = sunat.sunatModeInfo(); // avisa una vez si SUNAT_MODE es invalido
  const issues = [];
  try {
    const defaults = await Company.count({ where: { emisor_predeterminado: true } });
    if (defaults > 1) issues.push(`hay ${defaults} emisores predeterminados`);
    const ruc20 = await Company.count({ where: { tipo_ruc: '20', [Op.or]: [{ facturacion_habilitada: true }, { emisor_predeterminado: true }] } });
    if (ruc20) issues.push(`hay ${ruc20} empresa(s) RUC 20 habilitadas para facturar (usa el bloqueo explicito)`);
  } catch (error) {
    console.warn('[empresa] diagnostico omitido:', error.message);
  }
  issues.forEach(issue => console.warn(`[empresa] ${issue}`));
  return { mode: info.mode, modeValid: info.valid, issues };
};

module.exports = { ensureAdminEmpresaSchema };
