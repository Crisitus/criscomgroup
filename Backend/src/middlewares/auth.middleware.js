// En tu archivo auth.middleware.js
const jwt = require("jsonwebtoken");
const User = require('../models/user.model');
const AreaGrant = require('../models/area_grant.model');
const AffiliateBusiness = require('../models/affiliate_business.model');
const { Op } = require('sequelize');
const { isMasterEmail, isFuture } = require('./master.middleware');
require("dotenv").config();

module.exports = async (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({
        msg: "Acceso denegado, token no encontrado"
    });

    try {
        // Extraer el token si viene como "Bearer [token]"
        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
        const currentUser = await User.findByPk(decoded.id, { attributes: ['id_user', 'email', 'id_role', 'tipo_vendedor', 'acceso_expira_en', 'affiliate_business_id', 'superusuario_temporal', 'superusuario_expira_en', 'activo', 'token_version'] });
        if (!currentUser) return res.status(401).json({ msg: 'La cuenta ya no existe' });
        if (currentUser.activo === false) return res.status(403).json({ code: 'ACCOUNT_DISABLED', message: 'La cuenta está desactivada' });
        // Cambios de clave, de rol o desactivaciones suben token_version: los JWT anteriores dejan de valer.
        if (Number(decoded.tv || 0) !== Number(currentUser.token_version || 0)) return res.status(401).json({ code: 'SESSION_REVOKED', msg: 'La sesión ya no es válida. Inicia sesión nuevamente' });
        if (currentUser.id_role === 5 && !isFuture(currentUser.acceso_expira_en)) {
            return res.status(403).json({ code: 'TEMPORARY_ACCESS_EXPIRED', message: 'El acceso temporal ha caducado' });
        }
        const elevated = currentUser.id_role === 2 && currentUser.superusuario_temporal && isFuture(currentUser.superusuario_expira_en);
        if (currentUser.tipo_vendedor === 'afiliado' && currentUser.affiliate_business_id) {
            const business = await AffiliateBusiness.findByPk(currentUser.affiliate_business_id, { attributes: ['identidad_configurada'] });
            const identityRoute = req.originalUrl.startsWith('/api/affiliates/me');
            if (business && !business.identidad_configurada && !identityRoute) {
                return res.status(428).json({ code: 'AFFILIATE_IDENTITY_REQUIRED', message: 'Configura el nombre y logo de tu negocio antes de continuar' });
            }
        }
        const grants = await AreaGrant.findAll({ attributes: ['area'], where: { user_id: currentUser.id_user, active: true, [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }] } });
        req.user = { ...decoded, es_maestra: currentUser.id_role === 1 && isMasterEmail(currentUser.email), id: currentUser.id_user, id_user: currentUser.id_user, id_role: currentUser.id_role, email: currentUser.email, tipo_vendedor: currentUser.tipo_vendedor, acceso_expira_en: currentUser.acceso_expira_en, affiliate_business_id: currentUser.affiliate_business_id, superusuario_temporal: Boolean(elevated), superusuario_expira_en: currentUser.superusuario_expira_en, area_grants: grants.map(item => item.area) };
        next();
    }
    catch(error) {
        res.status(401).json({  // Corregido de status a status(401)
            msg: "Token no válido"
        });
    }
};
