// Middleware para verificar si un usuario puede acceder según su rol y el horario
const Company = require('../models/company.model');
const { AffiliateBusiness, AffiliateSettlement } = require('../models');
const { Op } = require('sequelize');

const businessHours = require('../services/business-hours.service');

const verificarHorarioLaboral = async (req, res, next) => {
  try {
    // Si no hay usuario autenticado, denegar acceso
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    // Rol 4 (No Autorizado) - No puede acceder a nada
    if (req.user.id_role === 4) {
      return res.status(403).json({ message: "Acceso denegado. Usuario no autorizado" });
    }

    // Los gerentes (rol 1) pueden acceder en cualquier momento
    if (req.user.id_role === 1) {
      return next();
    }

    // Los administradores (rol 2) pueden acceder en cualquier momento
    if (req.user.id_role === 2) {
      return next();
    }

    // Auditor temporal: puede operar y generar ventas mientras su acceso siga vigente.
    if (req.user.id_role === 5) return next();

    // Para vendedores (rol 3), verificar horario laboral (8:50 AM - 9:15 PM)
    if (req.user.id_role === 3) {
      if (req.user.tipo_vendedor === 'afiliado') {
        const business = await AffiliateBusiness.findByPk(req.user.affiliate_business_id);
        if (!business) return res.status(403).json({ code: 'AFFILIATE_BUSINESS_MISSING', message: 'El negocio afiliado no está configurado' });
        if (business.prueba_finaliza_en && new Date(business.prueba_finaliza_en) > new Date()) return next();
        const overdue = await AffiliateSettlement.findOne({ where: { affiliate_business_id: business.id_affiliate_business, estado: { [Op.in]: ['pendiente', 'vencido'] }, vence_en: { [Op.lt]: new Date() } } });
        if (overdue) {
          if (overdue.estado !== 'vencido') await overdue.update({ estado: 'vencido' });
          if (business.estado !== 'suspendido') await business.update({ estado: 'suspendido' });
        }
        if (business.estado !== 'activo' || overdue) return res.status(402).json({ code: 'AFFILIATE_SUBSCRIPTION_DUE', message: 'Debes pagar la liquidación mensual para continuar operando' });
        return next();
      }
      if (req.user.tipo_vendedor !== 'fisico') return next();
      const company = await Company.findOne({ order: [['emisor_predeterminado', 'DESC'], ['id_company', 'ASC']] });
      const horario = businessHours.evaluate(company);
      if (horario.dentro) {
        return next();
      } else {
        return res.status(403).json({
          message: `Acceso denegado. Fuera del horario laboral permitido (${horario.horario_inicio} - ${horario.horario_fin}, hora de Lima).`,
        });
      }
    }

    // Para cualquier otro rol no reconocido, denegar acceso
    return res.status(403).json({ message: "Rol no autorizado para acceder a esta funcionalidad" });
  } catch (error) {
    console.error("Error al verificar horario laboral:", error);
    return res.status(500).json({ message: "Error al verificar permisos de acceso" });
  }
};

// Middleware específico para verificar roles sin restricción de horario
const verificarRolesSinHorario = (rolesPermitidos, area = null) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "No autorizado" });
      }

      const auditorEquivalent = req.user.id_role === 5 && rolesPermitidos.includes(2);
      const areaGranted = area && req.user.area_grants?.includes(area);
      if (!rolesPermitidos.includes(req.user.id_role) && !auditorEquivalent && !areaGranted && !req.user.superusuario_temporal) {
        return res.status(403).json({ message: "No tienes permisos para acceder a esta funcionalidad" });
      }

      return next();
    } catch (error) {
      console.error("Error al verificar roles:", error);
      return res.status(500).json({ message: "Error al verificar permisos" });
    }
  };
};

const verificarHorarioOArea = area => (req, res, next) => {
  if (req.user?.superusuario_temporal || req.user?.area_grants?.includes(area)) return next();
  return verificarHorarioLaboral(req, res, next);
};

module.exports = {
  verificarHorarioLaboral,
  verificarRolesSinHorario,
  verificarHorarioOArea,
};
