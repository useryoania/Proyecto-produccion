const express = require('express');
const router = express.Router();
const sheets = require('../services/sheetsService');

// GET /google/auth — Genera la URL de autorización y la devuelve al frontend
router.get('/auth', (req, res) => {
    try {
        const url = sheets.getAuthUrl();
        res.json({ authUrl: url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /google/auth/callback?code=... — Recibe el code de Google y guarda el token
router.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Falta el código de autorización.');
    try {
        await sheets.saveTokenFromCode(code);
        res.send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:60px">
                <h2 style="color:#16a34a">✅ Google Sheets autorizado correctamente</h2>
                <p>Ya podés cerrar esta ventana y volver a la aplicación.</p>
                <script>setTimeout(()=>window.close(),3000)</script>
            </body></html>
        `);
    } catch (err) {
        res.status(500).send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px">
            <h2 style="color:#dc2626">❌ Error al autorizar</h2>
            <pre>${err.message}</pre>
        </body></html>`);
    }
});

// GET /google/status — Verifica si hay token con scope de sheets
router.get('/status', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const tokenPath = path.join(__dirname, '..', 'token.json');
    if (!fs.existsSync(tokenPath)) {
        return res.json({ authorized: false, reason: 'NO_TOKEN' });
    }
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const scope = token.scope || '';
    if (!scope.includes('spreadsheets')) {
        return res.json({ authorized: false, reason: 'NO_SHEETS_SCOPE' });
    }
    res.json({ authorized: true, scope });
});

module.exports = router;
