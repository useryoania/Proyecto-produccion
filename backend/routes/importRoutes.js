const express = require('express');
const router = express.Router();
const controller = require('../controllers/importController');

// POST /api/import/sync
router.post('/sync', controller.syncOrders);
router.post('/test-json', controller.testImportJson);

module.exports = router;