const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/client/:clientId', reportsController.getClientPriceOverview);
router.get('/profile/:profileId/clients', reportsController.getProfileClients);

module.exports = router;
