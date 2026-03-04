// apiordenesRetiro.js
const express = require('express');
const router = express.Router();
const { createOrdenRetiro, getOrdenesRetiroPorEstados, actualizarOrdenRetiroEstado, marcarOrdenRetiroPronto, ordenesRetiroCaja, marcarOrdenRetiroEntregado, getOrdenesRetiroPasarPorCaja, ordenesRetiroMarcarPasarPorCaja, getOrdenesRetiroPorFecha } = require('../controllers/ordenesRetiroController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Ruta para crear una Orden de Retiro
router.post('/crear', authenticateToken, createOrdenRetiro);

// Ruta para obtener todas las órdenes de retiro en estado "Ingresado"
router.get('/estados', getOrdenesRetiroPorEstados);

// Ruta para actualizar estado orden de retiro
router.post('/actualizarEstado', authenticateToken, actualizarOrdenRetiroEstado)

// Ruta para marcar una orden de retiro como pronto
router.post('/marcarPronto', authenticateToken, marcarOrdenRetiroPronto);

// Ruta para marcar orden como entregada
router.post('/marcarOrdenEntregada', authenticateToken, marcarOrdenRetiroEntregado)

// Ruta para traer las ordenes de retiro y ordenes para la caja
router.get('/caja', ordenesRetiroCaja);

// Ruta para traer las ordenes de retiro que deben pasar por caja
router.get('/pasarporcaja', getOrdenesRetiroPasarPorCaja);

// Ruta para traer las ordenes de retiro que deben pasar por caja
router.post('/marcarpasarporcaja/:pasar', authenticateToken, ordenesRetiroMarcarPasarPorCaja);

router.get('/filterByDate', getOrdenesRetiroPorFecha);

module.exports = router;
