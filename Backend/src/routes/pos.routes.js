const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');
const controller = require('../controllers/pos.controller');
const { registrarAuditoria } = require('../middlewares/audit.middleware');

router.use(auth);
router.get('/adquirentes', verificarRolesSinHorario([1, 2, 3]), controller.listAdquirentes);
router.post('/adquirentes', verificarRolesSinHorario([1], 'pagos_pos'), registrarAuditoria('crear', 'pos_adquirentes'), controller.createAdquirente);
router.patch('/adquirentes/:id', verificarRolesSinHorario([1], 'pagos_pos'), registrarAuditoria('actualizar', 'pos_adquirentes'), controller.updateAdquirente);
router.get('/pagos', verificarRolesSinHorario([1], 'pagos_pos'), controller.listPagos);
router.post('/ventas/:ventaId/confirmar', verificarRolesSinHorario([1], 'pagos_pos'), registrarAuditoria('confirmar_pago', 'pos_pagos'), controller.confirmarPagoVenta);
module.exports = router;


