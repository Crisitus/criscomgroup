const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');
const { registrarAuditoria, capturarEstadoOriginal } = require('../middlewares/audit.middleware');
const controller = require('../controllers/facturacion.controller');
const { Company } = require('../models');

router.use(auth);
// Emision: vendedores y administracion (la regla fina de afiliados vive en el controlador).
router.post('/emitir/:ventaId', verificarRolesSinHorario([1, 2, 3]), controller.emit);
// Lectura: gerente, administrador, auditor o usuario con el area `empresa_sunat`.
router.get('/documentos', verificarRolesSinHorario([1, 2, 5], 'empresa_sunat'), controller.status);
router.get('/emisores', verificarRolesSinHorario([1, 2, 5], 'empresa_sunat'), controller.emitters);
// Escritura fiscal: gerente + cuenta maestra, siempre auditada.
router.patch('/emisores/:id', verificarRolesSinHorario([1]), controller.requireFiscalAdmin, capturarEstadoOriginal(Company), registrarAuditoria('actualizar', 'emisores_fiscales'), controller.updateEmitter);
router.patch('/emisores/:id/predeterminado', verificarRolesSinHorario([1]), controller.requireFiscalAdmin, capturarEstadoOriginal(Company), registrarAuditoria('actualizar', 'emisores_fiscales'), controller.setDefaultEmitter);
router.post('/emisores/bloquear-ruc20', verificarRolesSinHorario([1]), controller.requireFiscalAdmin, registrarAuditoria('actualizar', 'emisores_fiscales'), controller.blockRuc20);
module.exports = router;
