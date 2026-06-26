const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getFiltros,
    getReporteFallasReposiciones,
    getReporteCancelaciones,
    getReporteOrdenes,
    getReporteMetrosMaterial,
    getReporteOperadores,
    getReporteClientes,
} = require('../controllers/reportesController');

router.get('/filtros',               verifyToken, getFiltros);
router.get('/fallas-reposiciones',   verifyToken, getReporteFallasReposiciones);
router.get('/cancelaciones',         verifyToken, getReporteCancelaciones);
router.get('/ordenes',               verifyToken, getReporteOrdenes);
router.get('/metros-material',       verifyToken, getReporteMetrosMaterial);
router.get('/operadores',            verifyToken, getReporteOperadores);
router.get('/clientes',              verifyToken, getReporteClientes);

module.exports = router;
