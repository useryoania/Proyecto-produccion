const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getDepositoDashboard } = require('../controllers/dashboardController');

router.get('/deposito', verifyToken, getDepositoDashboard);

module.exports = router;
