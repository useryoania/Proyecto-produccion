const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getDepositoDashboard } = require('../controllers/dashboardController');
const {
    getOverview,
    getAnalytics,
    getFiltros,
} = require('../controllers/productionAnalyticsController');
const { generarInforme } = require('../controllers/informeProduccionController');

router.get('/deposito', verifyToken, getDepositoDashboard);

// Producción analytics
router.get('/produccion/overview',  verifyToken, getOverview);
router.get('/produccion/analytics', verifyToken, getAnalytics);
router.get('/produccion/filtros',   verifyToken, getFiltros);
router.post('/produccion/informe',  verifyToken, generarInforme);

module.exports = router;
