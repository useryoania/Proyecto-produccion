// apiordenes.js
const express = require('express');
const router = express.Router();
const { getOrdenesByFilter, createOrden, getOrdenByCodigo, getOrdenesClienteByOrden, getOrdenesEstado, updateOrdenEstado, getEstadosOrdenes, updateExportacion, eliminarOrdenes } = require('../controllers/ordenesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Ruta para obtener todas las órdenes
router.get('/datafilter', getOrdenesByFilter);

// Ruta para obtener una orden específica por número
router.get('/data/:orderNumber', getOrdenByCodigo);

// Ruta para obtener las ordenes de un cliente a partir de una orden
router.get('/dataordenescliente/:idOrden',getOrdenesClienteByOrden)

// Ruta para crear orden
router.post('/data', authenticateToken, createOrden);

// Ruta para obtener órdenes por múltiples estados
router.get('/estados', getOrdenesEstado);

// Ruta para actualizar el estado de órdenes a "Avisado"
router.post('/actualizarEstado', authenticateToken, updateOrdenEstado);

// Ruta para obtener los estados de las órdenes
router.get('/estados/list', getEstadosOrdenes);

// Ruta para actualizar la exportacion de las ordenes
router.post('/actualizarExportacion', authenticateToken, updateExportacion)

// Ruta para eliminar órdenes de retiro
router.delete('/eliminar', authenticateToken, eliminarOrdenes);

module.exports = router;
