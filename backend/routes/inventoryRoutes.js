const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/authMiddleware'); // Asumiendo que usas autenticación

// Rutas de Inventario
router.get('/report', verifyToken, inventoryController.getInventoryReport);
router.get('/area', verifyToken, inventoryController.getInventoryByArea); // ?areaId=DTF
router.post('/stock/add', verifyToken, inventoryController.addStock);
router.post('/stock/close', verifyToken, inventoryController.closeBobina);
router.post('/stock/adjust', verifyToken, inventoryController.adjustBobina); // Nueva ruta ajuste
router.get('/stock/history', verifyToken, inventoryController.getBobinaHistory); // Nueva ruta historial

// CRUD Insumos (Catálogo)
router.get('/insumos', verifyToken, inventoryController.getInsumos);
router.post('/insumos', verifyToken, inventoryController.createInsumo);
router.put('/insumos/:id', verifyToken, inventoryController.updateInsumo);
router.delete('/insumos/:id', verifyToken, inventoryController.deleteInsumo);

module.exports = router;
