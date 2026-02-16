const express = require('express');
const router = express.Router();
const controller = require('../controllers/machineControlController');

// Obtener Slots de una Máquina
router.get('/:machineId/slots', controller.getMachineSlots);

// Ejecutar acción sobre un Slot (Mount, Unmount, Refill)
router.post('/:machineId/slots/:slotId/action', controller.handleSlotAction);

// Sugerencias de Bobinas para montar
router.get('/:machineId/available-bobbins', controller.getAvailableBobbins);

module.exports = router;
