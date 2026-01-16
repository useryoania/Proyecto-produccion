const express = require('express');
const router = express.Router();
const controller = require('../controllers/insumosController');

router.get('/', controller.getAllInsumos);
router.post('/', controller.createInsumo);
router.put('/:id', controller.updateInsumo);
router.delete('/:id', controller.deleteInsumo);

module.exports = router;
