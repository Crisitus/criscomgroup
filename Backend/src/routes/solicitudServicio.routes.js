const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const masterOnly = require('../middlewares/master.middleware');
const controller = require('../controllers/solicitudServicio.controller');
router.use(auth, (req,res,next) => req.user.id_role === 6 && !req.user.affiliate_business_id ? next() : masterOnly(req,res,next));
router.get('/', controller.list);
router.put('/:id', controller.update);
router.post('/:id/convertir', controller.convert);
module.exports = router;
