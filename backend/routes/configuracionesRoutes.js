const express = require('express');
const router = express.Router();
const configuracionesController = require('../controllers/configuracionesController');

router.get('/', configuracionesController.getConfiguraciones);
router.post('/toggle', configuracionesController.updateConfiguracion);
router.get('/get-planilla-row', configuracionesController.getPlanillaRow);
router.post('/set-planilla-row', configuracionesController.setPlanillaRow);

module.exports = router;
