const express = require('express');
const router = express.Router();
const tesoreriaController = require('../controllers/tesoreriaController');

// Catálogo de Bancos
router.get('/bancos', tesoreriaController.getBancos);

// Operaciones de Cartera de Cheques
router.get('/cheques', tesoreriaController.getCheques);
router.post('/cheques/recibir', tesoreriaController.recibirCheque);
router.post('/cheques/emitir', tesoreriaController.emitirCheque);
router.patch('/cheques/:id/estado', tesoreriaController.cambiarEstadoCheque);

module.exports = router;
