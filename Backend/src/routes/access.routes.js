const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const master = require('../middlewares/master.middleware');
const { exactMaster } = master;
const controller = require('../controllers/access.controller');
const { registrarAuditoria, capturarEstadoOriginal } = require('../middlewares/audit.middleware');
const { AccessRequest, AreaGrant } = require('../models');

router.get('/my', auth, controller.my);
router.post('/request', auth, registrarAuditoria('solicitar_acceso', 'access_requests'), controller.request);
router.get('/requests', auth, master, controller.list);
router.get('/grants', auth, master, controller.grants);
// Resolver y revocar: solo la cuenta maestra real (un rol 2 elevado no puede concederse accesos).
router.patch('/requests/:id', auth, exactMaster, capturarEstadoOriginal(AccessRequest), registrarAuditoria('resolver_solicitud_acceso', 'access_requests'), controller.resolve);
router.delete('/grants/:id', auth, exactMaster, capturarEstadoOriginal(AreaGrant), registrarAuditoria('revocar_acceso', 'area_grants'), controller.revoke);
module.exports = router;
