const express = require('express');
const router = express.Router();
const webContentController = require('../controllers/webContentController');

router.get('/active', webContentController.getActiveContent);
router.get('/all', webContentController.getAllContent);
router.post('/', webContentController.createContent);
router.put('/:id', webContentController.updateContent);
router.delete('/:id', webContentController.deleteContent);

module.exports = router;
