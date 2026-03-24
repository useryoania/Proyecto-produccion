const express = require('express');
const router = express.Router();
const pushService = require('../services/pushNotificationService');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/push/vapid-key — Devuelve la clave pública VAPID
router.get('/vapid-key', (req, res) => {
    if (!pushService.VAPID_PUBLIC) {
        return res.status(503).json({ error: 'Push notifications no configuradas' });
    }
    res.json({ publicKey: pushService.VAPID_PUBLIC });
});

// POST /api/push/subscribe — Guarda suscripción push
router.post('/subscribe', verifyToken, async (req, res) => {
    try {
        const clientId = req.user?.codCliente || req.user?.id;
        if (!clientId) return res.status(401).json({ error: 'No autenticado' });

        const { subscription } = req.body;
        if (!subscription?.endpoint) return res.status(400).json({ error: 'Subscription inválida' });

        await pushService.subscribe(clientId, subscription);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/push/unsubscribe — Elimina suscripción push
router.delete('/unsubscribe', verifyToken, async (req, res) => {
    try {
        const clientId = req.user?.codCliente || req.user?.id;
        if (!clientId) return res.status(401).json({ error: 'No autenticado' });

        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ error: 'Endpoint requerido' });

        await pushService.unsubscribe(clientId, endpoint);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
