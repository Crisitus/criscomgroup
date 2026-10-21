const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { verificarRolesSinHorario } = require('../middlewares/restricciones.middleware');
const controller = require('../controllers/adquisicion.controller');
router.use(auth, verificarRolesSinHorario([1, 2], 'compras'));
// El auditor (rol 5) consulta pero no registra adquisiciones
router.use((req, res, next) => req.method !== 'GET' && req.path !== '/evaluar' && req.user.id_role === 5 ? res.status(403).json({ success: false, message: 'Solo lectura para auditoría' }) : next());
router.get('/', controller.list);
router.post('/evaluar', controller.evaluate);
router.post('/', controller.create);
router.put('/:id', controller.update);
module.exports = router;
