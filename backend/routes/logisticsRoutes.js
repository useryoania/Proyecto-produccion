const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');

// --- LEGACY ---
// Validar lote antes de procesar
router.post('/validate-batch', logisticsController.validateBatch);
// Procesar lote (ingreso/egreso)
router.post('/process-batch', logisticsController.processBatch);

// --- NEW WMS (Bultos & Remitos) ---
// Bultos
router.post('/bultos', logisticsController.createBulto);
router.get('/bultos/:label', logisticsController.getBultoByLabel);

// Remitos (Dispatch)
router.post('/remitos', logisticsController.createRemito);
router.post('/remitos/validate', logisticsController.validateDispatch);
router.get('/remitos/:code', logisticsController.getRemitoByCode);

// Recepción
router.post('/receive', logisticsController.receiveDispatch);

// Dashboard & History
router.get('/dashboard', logisticsController.getDashboard);
router.get('/history', logisticsController.getHistory);

module.exports = router;