const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');
const { registrarAuditoria } = require('../middlewares/audit.middleware');
const { getPublicSocialLinks, getAdminSocialLinks, updateSocialLinks } = require('../controllers/social_links.controller');

const router = express.Router();

router.get('/', getPublicSocialLinks);
router.get('/admin', authMiddleware, verificarRolesSinHorario([1, 2], 'marketing'), getAdminSocialLinks);
router.patch('/admin', authMiddleware, verificarRolesSinHorario([1, 2], 'marketing'), registrarAuditoria('actualizar', 'social_links'), updateSocialLinks);

module.exports = router;
