const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/webDesignerController');
const { verifyToken } = require('../middleware/authMiddleware');

// Público: registro de diseñadores (queda pendiente de aprobación)
router.post('/register', ctrl.register);

// Autenticado (cliente): gestionar SUS diseñadores + toggle de aprobación
router.get('/directorio', verifyToken, ctrl.getDirectorio);
router.get('/mis-disenadores', verifyToken, ctrl.getMisDisenadores);
router.post('/vincular', verifyToken, ctrl.vincular);
router.delete('/vincular/:disenadorId', verifyToken, ctrl.desvincular);
router.put('/aprobacion', verifyToken, ctrl.setAprobacion);

// Autenticado (diseñador): sus clientes
router.get('/mis-clientes', verifyToken, ctrl.getMisClientes);

// Autenticado (diseñador): estado de los pedidos que ÉL creó (sin precios ni importes)
router.get('/mis-pedidos', verifyToken, ctrl.getMisPedidos);

// Admin (usuarios internos, vista /designers): aprobar / activar diseñadores
router.get('/admin/lista', verifyToken, ctrl.adminListaDisenadores);
router.put('/admin/:disenadorId', verifyToken, ctrl.adminActualizarDisenador);

module.exports = router;
