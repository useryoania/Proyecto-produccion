const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/sysadminController');

// Middleware: solo admins (case-insensitive, acepta variantes)
const ADMIN_ROLES = ['admin', 'administrador', 'sysadmin'];
const requireAdmin = (req, res, next) => {
    const role = (req.user?.role || '').toLowerCase().trim();
    if (!req.user || !ADMIN_ROLES.includes(role)) {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol admin.' });
    }
    next();
};

router.use(verifyToken, requireAdmin);

// Phase 1
router.get('/status', ctrl.getSystemStatus);
router.get('/logs', ctrl.getLogFiles);
router.get('/logs/:filename', ctrl.getLogContent);
router.get('/metrics', ctrl.getDailyMetrics);

// Phase 2
router.get('/sessions', ctrl.getSessions);
router.post('/sql', ctrl.executeSql);
router.post('/restart', ctrl.restartServer);

// Phase 3
router.get('/services', ctrl.testServices);
router.post('/backup', ctrl.backupDatabase);
router.get('/client-errors', ctrl.getClientErrors);
router.get('/tables', ctrl.getTableInfo);
router.get('/tables/:tableName', ctrl.getTableColumns);
router.get('/audit', ctrl.getAuditTrail);

module.exports = router;
