const express = require('express');
const router = express.Router();
// IMPORTANTE: Asegúrate de que el archivo en controllers se llame exactamente así
const RestSyncController = require('../controllers/RestSyncController'); 
const ImportOnDemandController = require('../controllers/importOnDemandController'); // NUEVO

// Esta es la ruta que llama el botón
router.post('/run', RestSyncController.syncOrders); 
// Ruta para validacion/creación a demanda manual
router.post('/import-on-demand', ImportOnDemandController.importOnDemand);

// Ruta para visualizacion y cotizacion sin guardar
router.post('/preview-on-demand', ImportOnDemandController.previewOnDemand);

module.exports = router;