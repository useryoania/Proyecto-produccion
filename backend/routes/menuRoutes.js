const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

const { verifyToken } = require('../middleware/authMiddleware');

// Rutas públicas (o protegidas por middleware global)
router.get('/user/:userId', verifyToken, menuController.getByUser);

// Rutas de administración (CRUD)
router.get('/', verifyToken, menuController.getAll);       // Listar todos para el editor
router.post('/', verifyToken, menuController.create);      // Crear nuevo
router.put('/:id', verifyToken, menuController.update);    // Actualizar existente
router.delete('/:id', verifyToken, menuController.remove); // Eliminar

module.exports = router;