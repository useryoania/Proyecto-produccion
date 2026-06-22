const express = require('express');
const router = express.Router();
const controller = require('../controllers/colorController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/defaults', verifyToken, controller.getDefaults);
router.get('/profiles', verifyToken, controller.getProfiles);
router.post('/match', verifyToken, controller.match);

// Chart de referencia (parches medidos con espectro)
router.get('/charts', verifyToken, controller.listCharts);
router.get('/charts/:id', verifyToken, controller.getChart);
router.post('/charts', verifyToken, controller.saveChart);
router.post('/charts/:id/activate', verifyToken, controller.activateChart);

// Calibración por foto (usa la tirada activa)
router.post('/calibrate', verifyToken, controller.calibrate);

module.exports = router;
