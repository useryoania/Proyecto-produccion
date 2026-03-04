const express = require('express');
const router = express.Router();
const { getCliente, createCliente, getAllClientes, updateCliente, getTiposClientes, bloquearCliente, desbloquearCliente, desbloquearTodosClientes } = require('../controllers/clientesController');
const { authenticateToken } = require('../middleware/authMiddleware');


// Ruta para obtener datos de un cliente
router.post('/data', getCliente);

// Ruta para crear clientes
router.post('/create', createCliente);

// Ruta para obtener datos de un cliente
router.get('/dataall', getAllClientes);

// Ruta para actualizar datos de un cliente
router.put('/update', updateCliente);

// Ruta para obtener los tipos de cliente
router.get('/tipos', getTiposClientes);

// Ruta para bloquear un cliente
router.post('/bloquear', authenticateToken, bloquearCliente);

// Ruta para desbloquear un cliente
router.post('/desbloquear', authenticateToken, desbloquearCliente);

// Ruta para desbloquear a todos los clientes
router.post('/desbloquearTodos', authenticateToken, desbloquearTodosClientes);

module.exports = router;
