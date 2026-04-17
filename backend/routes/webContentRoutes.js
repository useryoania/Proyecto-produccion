const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });
const webContentController = require('../controllers/webContentController');

router.get('/active', webContentController.getActiveContent);
router.get('/all', webContentController.getAllContent);
router.post('/', webContentController.createContent);
router.put('/:id', webContentController.updateContent);
router.delete('/:id', webContentController.deleteContent);
router.post('/contact', webContentController.sendContactForm);
router.post('/jobs', uploadMemory.single('cv'), webContentController.sendJobApplication);
router.post('/newsletter', webContentController.subscribeNewsletter);

module.exports = router;
