const express = require('express');
const router = express.Router();
const canastosController = require('../controllers/canastosController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/resumen', canastosController.getCanastosResumen);
router.get('/ordenes', canastosController.getOrdenesPorCanasto);
router.post('/mover', canastosController.moverOrdenes);

module.exports = router;
