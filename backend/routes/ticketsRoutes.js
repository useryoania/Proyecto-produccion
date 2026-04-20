const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig');

// Todo el módulo de tickets es privado (ya sea web_client o admin)
router.use(verifyToken);

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS COMPARTIDAS (Web Client y Admins)
// ─────────────────────────────────────────────────────────────────────────────
// Obtener lista de departamentos habilitados (el controlador filtra según rol)
router.get('/categorias', ticketsController.getCategorias);

// Obtener detalles de un ticket específico
router.get('/:id', ticketsController.getTicketDetails);

// Responder a un ticket (enviar mensaje) -> req.files.evidencia opcional
// Admins pueden enviar esNotaInterna en el body.
router.post('/:id/responder', upload.array('evidencia', 5), ticketsController.replyToTicket);

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS CLIENTES WEB 
// ─────────────────────────────────────────────────────────────────────────────
// Obtener todos mis tickets (El controlador filtra CliId = userId si el rol es WEB_CLIENT)
router.get('/', ticketsController.getTickets);

// Crear nuevo ticket
router.post('/', upload.array('evidencia', 5), ticketsController.createTicket);

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS ADICIONALES ADMINS
// ─────────────────────────────────────────────────────────────────────────────
// Actualizar estado o derivar (Resolver, Cerrar)
router.put('/:id/estado', ticketsController.updateTicketStatus);

module.exports = router;
