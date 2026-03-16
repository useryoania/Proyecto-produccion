const { getPool, sql } = require('../config/db');
const { processOrderList } = require('../services/fileProcessingService');
const logger = require('../utils/logger');

exports.reprocessOrder = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Falta OrderID' });

    try {
        const pool = await getPool();
        logger.info(`🔄 [DEBUG] Forzando reproceso de Orden ${id}...`);

        // 1. Limpiar datos previos de archivos para obligar a re-descargar o re-validar
        // NOTA: No borramos RutaLocal del disco físico aquí, solo la referencia en DB para que el script evalúe.
        // Si queremos forzar re-nombre, deberíamos borrar RutaLocal de la DB.

        await pool.request()
            .input('OID', sql.Int, id)
            .query(`
                UPDATE ArchivosOrden 
                SET MedidaConfirmada = 0, 
                    Ancho = 0, 
                    Alto = 0, 
                    Metros = 0,
                    RutaLocal = NULL  -- Forzamos a que busque de nuevo o descargue y renombre con ID
                WHERE OrdenID = @OID
            `);

        // 2. Disparar proceso
        processOrderList([parseInt(id)], req.app.get('socketio'));

        res.json({ message: `Orden ${id} enviada a cola de reprocesamiento V31.` });

    } catch (error) {
        logger.error("Error en reprocess:", error);
        res.status(500).json({ error: error.message });
    }
};
