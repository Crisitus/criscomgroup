const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const rucReniecController = require('../controllers/reniec.controller');

const router = express.Router();

router.get('/:dni',authMiddleware, rucReniecController.getDniData);

module.exports = router;