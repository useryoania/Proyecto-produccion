const express = require('express');
const router = express.Router();
const controller = require('../controllers/logisticaWmsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/pending', verifyToken, controller.getPendingOrders);
router.get('/prepared', verifyToken, controller.getPreparedOrders);
router.put('/start/:pedidoId', verifyToken, controller.startPreparation);
router.put('/confirm/:pedidoId', verifyToken, controller.confirmPreparation);
router.put('/receive/:pedidoId', verifyToken, controller.receivePreparedOrder);
router.put('/update-item/:pedidoId', verifyToken, controller.updateItemQuantity);
router.delete('/delete-item/:pedidoId/:wms_variante_id', verifyToken, controller.deleteItem);
router.put('/cancel/:pedidoId', verifyToken, controller.cancelOrder);
router.put('/deliver/:pedidoId', verifyToken, controller.markDelivered);

module.exports = router;
