const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const master = require('../middlewares/master.middleware');
const { exactMaster } = master;
const controller = require('../controllers/affiliate.controller');
const upload = require('../middlewares/upload.middleware');
const { registrarAuditoria, capturarEstadoOriginal } = require('../middlewares/audit.middleware');
const { AffiliatePayment } = require('../models');

router.use(auth);
router.get('/', master, controller.list);
router.get('/me', controller.myAccount);
router.put('/me/identity', upload.single('affiliate_logo'), registrarAuditoria('actualizar_identidad', 'affiliate_businesses'), controller.updateIdentity);
// Generar liquidaciones y validar pagos: solo la cuenta maestra real (un rol 2 elevado no valida dinero, ni el suyo).
router.post('/:businessId/settlements', exactMaster, registrarAuditoria('generar_liquidacion', 'affiliate_settlements', { idParam: 'businessId' }), controller.generateSettlement);
router.post('/settlements/:settlementId/payments', registrarAuditoria('registrar_pago', 'affiliate_payments', { idParam: 'settlementId' }), controller.submitPayment);
router.post('/settlements/:settlementId/pay-card', controller.payByCard);
router.patch('/payments/:paymentId/validate', exactMaster, capturarEstadoOriginal(AffiliatePayment, 'paymentId'), registrarAuditoria('validar_pago', 'affiliate_payments', { idParam: 'paymentId' }), controller.validatePayment);
module.exports = router;
