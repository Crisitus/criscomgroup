const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');
const { registrarAuditoria } = require('../middlewares/audit.middleware');
const controller = require('../controllers/payment-gateway.controller');

// Gerentes (rol 1) y usuarios con el area `pagos_pos`. Cada cambio queda auditado (sin credenciales).
router.use(auth, verificarRolesSinHorario([1], 'pagos_pos'));
// Deja la pasarela afectada en el cuerpo para que la auditoria sepa cual fue.
const tag = (req, _res, next) => { req.body = { ...(req.body || {}), provider: req.params.provider }; next(); };
router.get('/catalog', controller.catalog);
router.get('/', controller.list);
router.put('/:provider', tag, registrarAuditoria('actualizar', 'pasarelas_pago'), controller.save);
router.post('/:provider/test', tag, registrarAuditoria('probar', 'pasarelas_pago'), controller.test);
router.post('/:provider/default', tag, registrarAuditoria('activar', 'pasarelas_pago'), controller.setDefault);
router.delete('/:provider/default', tag, registrarAuditoria('desactivar', 'pasarelas_pago'), controller.clearDefault);

module.exports = router;
