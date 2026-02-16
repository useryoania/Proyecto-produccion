const express = require('express');
const router = express.Router();
const SheetService = require('../services/sheetService');

// Esta es la ruta que llamarás desde el navegador o el frontend
router.get('/importar-base', async (req, res) => {
    try {
        const resultado = await SheetService.importarBase();
        
        // Obtener socket.io para avisar al frontend
        const io = req.app.get('socketio');
        if (io) {
            io.emit('actualizacion_completa', { 
                mensaje: 'Sincronización con Google Sheets exitosa' 
            });
        }

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;