const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const areaAccess = require('../middlewares/area.middleware');
const controller = require('../controllers/gastoTaller.controller');

// Mismo criterio de acceso que Órdenes de servicio: master (1), técnico (6),
// superusuario temporal, o quien tenga el grant de área "servicio_tecnico".
router.use(auth, (req, res, next) => {
  if (req.user.id_role === 1 || req.user.superusuario_temporal || req.user.id_role === 6) return next();
  return areaAccess('servicio_tecnico')(req, res, next);
});

router.get('/resumen', controller.summary);
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
