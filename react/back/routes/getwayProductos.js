const express = require('express');
const router = express.Router();
const { getProductos, createProducto, updateProducto, getCategorias, getMonedas } = require('../controllers/productController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Ruta para obtener datos
router.get('/data', getProductos);

// Ruta para crear un nuevo producto
router.post('/data', authenticateToken, createProducto);

// Ruta para actualizar el PrecioActual de un producto
router.put('/data', authenticateToken, updateProducto); // Definimos la ruta PUT para la actualización

// Ruta para obtener categorías
router.get('/categories', getCategorias);

// Ruta para obtener monedas
router.get('/currencies', getMonedas);

module.exports = router;