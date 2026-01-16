const express = require('express');
const router = express.Router();
const controller = require('../controllers/rollsController'); // 👈 Aquí se llama "controller"

router.get('/board', controller.getBoardData);
router.get('/list', controller.getRollosActivos); // Endpoint específico para combo
router.post('/move', controller.moveOrder);
router.post('/create', controller.createRoll);
router.post('/reorder', controller.reorderOrders);

// 👇 CORREGIDO: Debe decir "controller" (singular), igual que arriba
router.post('/update-name', controller.updateRollName);
router.post('/dismantle', controller.dismantleRoll);
router.get('/history', controller.getRollHistory); // New endpoint for history
router.get('/:id/labels', controller.getRollLabels); // New
router.post('/:id/generate-labels', controller.generateRollLabels);

router.get('/metrics/:rolloId', controller.getRolloMetrics);
router.get('/details/:rolloId', controller.getRollDetails);

// Magic Route
router.post('/magic', controller.magicRollAssignment);

module.exports = router;