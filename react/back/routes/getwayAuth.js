const express = require('express');
const { login, registerUser, getRoles, generateToken } = require('../controllers/authController');
const router = express.Router();

router.post('/login', login);
router.post('/register', registerUser);
router.get('/roles', getRoles); 
router.post('/generate-token', generateToken);

module.exports = router;
