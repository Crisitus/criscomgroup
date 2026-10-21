const express = require('express');
const router = express.Router();
const ofertasCtrl = require('../controllers/ofertasDelDia.controller');
const auth = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');

// Solo Gerentes (rol 1) y Administradores (rol 2) pueden gestionar ofertas
router.get('/', auth, verificarRolesSinHorario([1, 2]), ofertasCtrl.getOfertasDelDia);
router.put('/', auth, verificarRolesSinHorario([1, 2]), ofertasCtrl.putOfertasDelDia);
router.post('/eliminar-lote', auth, verificarRolesSinHorario([1, 2]), ofertasCtrl.deleteOfertasLote);
router.delete('/:productoId', auth, verificarRolesSinHorario([1, 2]), ofertasCtrl.deleteOfertaDelDia);

module.exports = router;
