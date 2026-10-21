const router = require('express').Router();
const controller = require('../controllers/blog.controller');
const auth = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');
const { registrarAuditoria, capturarEstadoOriginal } = require('../middlewares/audit.middleware');
const { BlogPost } = require('../models');

const guard = [auth, verificarRolesSinHorario([1, 2], 'marketing')];

router.get('/public', controller.publicList);
router.get('/public/:slug', controller.publicOne);
router.get('/admin', ...guard, controller.adminList);
router.get('/admin/categorias', ...guard, controller.categories);
router.get('/admin/:id(\\d+)', ...guard, controller.adminOne);
router.post('/admin', ...guard, registrarAuditoria('crear', 'blog_posts'), controller.create);
router.put('/admin/:id(\\d+)', ...guard, capturarEstadoOriginal(BlogPost, 'id'), registrarAuditoria('actualizar', 'blog_posts'), controller.update);
router.delete('/admin/:id(\\d+)', ...guard, capturarEstadoOriginal(BlogPost, 'id'), registrarAuditoria('eliminar', 'blog_posts'), controller.remove);

module.exports = router;
