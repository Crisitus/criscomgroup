const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const areaAccess = require('../middlewares/area.middleware');
const controller = require('../controllers/activoTecnico.controller');

router.use(auth, (req, res, next) => {
  if (req.user.id_role === 1 || req.user.superusuario_temporal || req.user.id_role === 6) return next();
  return areaAccess('servicio_tecnico')(req, res, next);
});
router.get('/clientes', controller.listClients);
router.post('/clientes', controller.createClient);
router.get('/activos', controller.listAssets);
router.post('/activos', controller.createAsset);

module.exports = router;
