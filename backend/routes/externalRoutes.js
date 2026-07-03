const express = require('express');
const router = express.Router();
const externalController = require('../controllers/externalController');

// Endpoint para extraer la lista de Vendedores (Trabajadores)
// GET /api/external/vendedores
router.get('/vendedores', externalController.getVendedores);

// Endpoint para extraer la lista de clientes desde otro sistema
// GET /api/external/clientes
router.get('/clientes', externalController.getClientes);

// Endpoint para actualizar el Vendedor de un cliente
// PATCH /api/external/clientes/:id/vendedor
router.patch('/clientes/:id/vendedor', externalController.updateVendedor);

// --- RUTAS INTEGRADAS DE STOCK Y WMS ---

// GET /api/external/articulos
router.get('/articulos', externalController.getArticulos);

// POST /api/external/articulos/descontar
router.post('/articulos/descontar', externalController.descontarArticulo);

// GET /api/external/inventory/variants
router.get('/inventory/variants', externalController.getInventoryVariants);

// GET /api/external/inventory/categories
router.get('/inventory/categories', externalController.getInventoryCategories);

// GET /api/external/inventory/masters
router.get('/inventory/masters', externalController.getInventoryMasters);

// GET /api/external/inventory/masters/:id/variants
router.get('/inventory/masters/:id/variants', externalController.getInventoryMasterVariants);

module.exports = router;
