const express = require('express');
const router = express.Router();

// Importamos los controladores
const stockCtrl = require('../controllers/stockController');
const invCtrl = require('../controllers/inventoryController');

// --- Rutas de Solicitudes (stockController) ---
router.post('/', stockCtrl.createRequest);
router.get('/history', stockCtrl.getHistory);
router.get('/all', stockCtrl.getAllRequests); // Nueva ruta
router.put('/:id/status', stockCtrl.updateRequestStatus); // Nueva ruta
router.get('/urgent-count', stockCtrl.getUrgentCount);

// --- Rutas de Inventario (inventoryController) ---
router.get('/items', invCtrl.getInsumos);
router.post('/items', invCtrl.createInsumo);

module.exports = router;