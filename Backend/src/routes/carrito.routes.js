const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const controller = require('../controllers/carrito.controller');

router.use(auth);
router.get('/', controller.list);
router.post('/items', controller.add);
router.put('/items/:productId', controller.update);
router.delete('/items/:productId', controller.remove);
router.delete('/', controller.clear);
router.post('/merge', controller.merge);

module.exports = router;
