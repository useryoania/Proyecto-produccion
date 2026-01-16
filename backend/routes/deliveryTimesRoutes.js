const express = require('express');
const router = express.Router();
const controller = require('../controllers/deliveryTimesController');

router.get('/', controller.getAllDeliveryTimes);
router.post('/', controller.createDeliveryTime);
router.put('/:id', controller.updateDeliveryTime);
router.delete('/:id', controller.deleteDeliveryTime);

module.exports = router;
