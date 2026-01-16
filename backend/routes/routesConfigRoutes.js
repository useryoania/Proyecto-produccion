const express = require('express');
const router = express.Router();
const controller = require('../controllers/routesConfigController');

router.get('/', controller.getAllRules);
router.post('/', controller.createRule);
router.put('/:id', controller.updateRule);
router.delete('/:id', controller.deleteRule);

module.exports = router;
