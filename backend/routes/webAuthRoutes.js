const express = require('express');
const router = express.Router();
const webAuthController = require('../controllers/webAuthController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', webAuthController.login);
router.post('/register', webAuthController.register);
router.get('/activate', webAuthController.activate);
router.get('/me', verifyToken, webAuthController.me);
router.post('/update-password', verifyToken, webAuthController.updatePassword);
router.put('/profile', verifyToken, webAuthController.updateProfile);

module.exports = router;
