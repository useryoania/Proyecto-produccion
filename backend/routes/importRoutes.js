const express = require('express');
const router = express.Router();
const controller = require('../controllers/importController');

// GET /api/import/sync
router.get('/sync', controller.syncOrders);

module.exports = router;