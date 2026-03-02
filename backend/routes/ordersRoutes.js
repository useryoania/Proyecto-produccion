const express = require('express');
const router = express.Router();

// Importamos el controlador
const ordersController = require('../controllers/ordersController');
const clientOrdersController = require('../controllers/clientOrdersController');

// 👇 Importamos Middleware de Autenticación
const { verifyToken, authorizeAdminOrArea } = require('../middleware/authMiddleware');

// RUTAS CLIENTE WEB
router.post('/client', verifyToken, clientOrdersController.createClientOrder);

// --- AQUÍ VAN LAS RUTAS DE CONSULTA ESPECÍFICA (Antes de las rutas con :id) ---

// Reportes y Búsqueda Avanzada
router.post('/search/advanced', ordersController.advancedSearchOrders); // TODO: Restaurar verifyToken luego de debug
router.get('/details/:id', ordersController.getOrderFullDetails); // También liberamos detalles para prueba
router.get('/search/integral/:ref', ordersController.getIntegralPedidoDetailsV2); // Nueva Ruta Integral (Version SQL SP)
router.get('/priorities', ordersController.getPrioritiesConfig);

// Ruta para el resumen de la ActiveOrdersCard.jsx (Protegida)
router.get('/active', verifyToken, authorizeAdminOrArea, ordersController.getActiveOrdersSummary);
router.get('/cancelled', verifyToken, authorizeAdminOrArea, ordersController.getCancelledOrdersSummary);
router.get('/failed', verifyToken, authorizeAdminOrArea, ordersController.getFailedOrdersSummary);

// 1. RUTAS PRINCIPALES (CRUD)
router.get('/', verifyToken, ordersController.getOrdersByArea);      // Obtener lista completa
router.post('/', verifyToken, ordersController.createOrder);         // Crear orden

// Acciones específicas SIN ID en URL (POST global)
router.post('/assign-roll', verifyToken, ordersController.assignRoll);
router.post('/unassign-roll', verifyToken, ordersController.unassignOrder);
router.post('/cancel', verifyToken, ordersController.cancelOrder);
router.post('/cancel-request', verifyToken, ordersController.cancelRequest);
router.post('/cancel-roll', verifyToken, ordersController.cancelRoll);

// Rutas con :id (DEBEN IR AL FINAL de los GET/PUT/DELETE específicos)
router.delete('/:id', verifyToken, ordersController.deleteOrder);
router.put('/:id/status', verifyToken, ordersController.updateStatus);
router.put('/:id/area-status', verifyToken, ordersController.updateAreaStatus);
router.get('/history/:id', verifyToken, ordersController.getOrderHistory);

// 2. GESTIÓN DE ARCHIVOS
router.put('/file/update', verifyToken, ordersController.updateFile);
router.post('/file/add', verifyToken, ordersController.addFile);
router.post('/file/cancel', verifyToken, ordersController.cancelFile);
router.put('/service/update', verifyToken, ordersController.updateService);
router.delete('/file/:id', verifyToken, ordersController.deleteFile);

// Extras (Safe Load) - Separados
router.get('/:id/references', ordersController.getOrderReferences);
router.get('/:id/services', ordersController.getOrderServices);

router.post('/assign-fabric-bobbin', verifyToken, ordersController.assignFabricBobbin);
module.exports = router;