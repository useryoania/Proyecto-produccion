const express = require('express');
const router = express.Router();

// Verifica que la ruta al archivo sea correcta (../controllers/adminController)
const adminController = require('../controllers/adminController');

// Aquí es donde daba el error. 
// Si adminController.getDynamicData no existe, explota.
router.get('/dynamic', adminController.getDynamicData);

module.exports = router;