const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

// Rutas de Pagos / Checkout

// POST /api/checkout/crear-pago
// Genera el Link de Pago unificado para múltiples NoDocERP
router.post('/crear-pago', checkoutController.crearIntencionPago);

// POST /api/checkout/handy-webhook
// Recibe las notificaciones de éxito directo desde los servidores de Handy
router.post('/handy-webhook', checkoutController.handyWebhook);

module.exports = router;
