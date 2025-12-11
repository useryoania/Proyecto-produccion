// C:\sistema-produccion\backend-externo\routes\exportacion.routes.js 

const express = require('express');
const router = express.Router();
const exportacionController = require('../controllers/exportacion.controller');

// 1. Endpoint: /api/pedidos (Consulta grande)
router.get('/pedidos', exportacionController.exportarPedidos); 

// 2. Endpoint: /api/identificadores/:codDoc (Nueva consulta parametrizada)
router.get('/identificadores/:codDoc', exportacionController.exportarIdentificadores); 

module.exports = router;