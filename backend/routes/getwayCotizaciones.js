const express = require('express');
const router = express.Router();
const { getCotizacionesHoy, insertCotizacion, fetchFromBCU } = require('../controllers/cotizacionesController');

// Ruta para obtener cotizaciones de hoy
router.get('/hoy', getCotizacionesHoy);

// Ruta para insertar una nueva cotización
router.post('/insertar', insertCotizacion);

// Buscar cotización directamente del BCU (on demand)
router.get('/bcu', fetchFromBCU);

module.exports = router;
