const express = require('express');
const router = express.Router();
// Importamos el controlador que tiene la lógica JWT
const authController = require('../controllers/authController');

// Delegamos el login al controlador
router.post('/login', authController.login);

// Si hubiera más rutas inline, habría que moverlas, pero por ahora solo el login es crítico.
// ...

module.exports = router;