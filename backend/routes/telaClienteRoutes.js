const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/telaClienteController');
const { verifyToken } = require('../middleware/authMiddleware');

// Saldo de metros por tipo de tela
router.get('/:clienteId/saldo',         verifyToken, ctrl.getSaldo);

// Estado de cuenta completo (extracto)
router.get('/:clienteId/estado-cuenta', verifyToken, ctrl.getEstadoCuenta);

// Bultos físicos activos
router.get('/:clienteId/bultos',         verifyToken, ctrl.getBultos);

// Reservar metros para una orden (consumo por adelantado)
router.post('/:clienteId/reservar',      verifyToken, ctrl.reservarMetros);

// Liberar reserva si se cancela la orden
router.post('/:clienteId/liberar',       verifyToken, ctrl.liberarReserva);

module.exports = router;
