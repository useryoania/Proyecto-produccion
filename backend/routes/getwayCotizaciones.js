const express = require('express');
const router = express.Router();
const { getCotizacionesHoy, insertCotizacion } = require('../controllers/cotizacionesController');

// Ruta para obtener cotizaciones de hoy
router.get('/hoy', getCotizacionesHoy);

// Ruta para insertar una nueva cotización
router.post('/insertar', insertCotizacion);

module.exports = router;
