// Archivo de rutas (lugaresRoutes.js)
const express = require('express');
const router = express.Router();
const { getLugaresRetiro } = require('../controllers/lugaresRetiroController.js');

// Ruta para obtener los lugares de retiro
router.get('/lugares-retiro', getLugaresRetiro);

// Exportar las rutas
module.exports = router;