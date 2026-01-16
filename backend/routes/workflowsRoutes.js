const express = require('express');
const router = express.Router();
const controller = require('../controllers/workflowsController');

router.get('/', controller.getWorkflows);
router.post('/', controller.createWorkflow);
router.delete('/:id', controller.deleteWorkflow);

module.exports = router;