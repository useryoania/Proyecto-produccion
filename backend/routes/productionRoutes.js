const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

// Kanban y Asignación
router.get('/board', productionController.getProductionBoard);
router.post('/assign', productionController.assignRoll);
router.post('/toggle-status', productionController.toggleRollStatus);
router.get('/details', productionController.getOrderDetails);

// Control de Calidad
router.get('/ready-for-control', productionController.getRollAndFiles);
router.post('/register-action', productionController.registerFileAction);

// Compatibilidad con Tabla
router.get('/board-data', productionController.getBoardData);
router.post('/move-order', productionController.moveOrder);
router.post('/create-roll', productionController.createRoll);
router.post('/magic-sort', productionController.magicSort);

module.exports = router;