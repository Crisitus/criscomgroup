const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const masterOnly = require('../middlewares/master.middleware');
const controller = require('../controllers/importacion.controller');

router.use(auth, masterOnly, (req, res, next) => req.isExactMaster ? next() : res.status(403).json({ message: 'Importaciones es exclusivo de Crisitus' }));
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
