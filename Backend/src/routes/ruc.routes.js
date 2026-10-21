const express = require('express');
const rucReniecController = require('../controllers/ruc.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/:ruc',authMiddleware, rucReniecController.getRucData);

module.exports = router;