const express = require('express');
const router = express.Router();
const controller = require('../controllers/measurementController');

// GET: Obtener lista de trabajo
router.get('/', controller.getOrdersToMeasure);

// POST: Analizar archivos (Medición Automática)
router.post('/analyze', controller.measureFiles);

// POST: Guardar cambios en base de datos
router.post('/save', controller.saveMeasurements);

router.post('/auto-measure', controller.measureFiles);
router.post('/process-batch', controller.processBatch);

module.exports = router;

