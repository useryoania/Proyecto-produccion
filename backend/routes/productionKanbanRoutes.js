const express = require('express');
const router = express.Router();
const productionKanbanController = require('../controllers/productionKanbanController');

router.get('/board', productionKanbanController.getBoard);
router.post('/assign', productionKanbanController.assignRoll);
router.post('/unassign', productionKanbanController.unassignRoll);

module.exports = router;