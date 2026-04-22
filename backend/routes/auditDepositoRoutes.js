const express = require('express');
const router = express.Router();
const auditDepositoController = require('../controllers/auditDepositoController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/check', auditDepositoController.checkAudit);
router.post('/actions', auditDepositoController.performAction);
router.post('/notify', auditDepositoController.notifyAction);

// Endpoint unificado de carga inicial (liveCodes + auditData en un solo request)
router.get('/init', auditDepositoController.initAudit);

// Endpoints para persistencia de escaneo temporal en DB
router.get('/live', auditDepositoController.getLiveScans);
router.post('/live', auditDepositoController.addLiveScan);
router.post('/live/remove', auditDepositoController.removeLiveScan);
router.post('/live/clear', auditDepositoController.clearLiveScans);

module.exports = router;
