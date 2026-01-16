const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware'); // Opcional si queremos protegerlo

// POST /api/chat
// Protegido por token para saber quién pregunta

// Ruta normal del Chat
router.post('/', verifyToken, chatController.handleChatMessage);

// Ruta de diagnóstico (Sin token para facilitar prueba rápida en navegador)
router.get('/test-gemini', chatController.testGeminiConnection);

module.exports = router;
