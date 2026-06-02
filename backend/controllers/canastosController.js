const sql = require('mssql');
const { getPool } = require('../config/db');
const logger = require('../utils/logger');

// Obtener la cuenta de órdenes agrupadas por Canasto (EstadoLogistica)
const getCanastosResumen = async (req, res) => {
    try {
        const { area } = req.query;
        const pool = await getPool();
        const request = pool.request();

        let query = `
            SELECT ISNULL(EstadoLogistica, 'Canasto Produccion') AS canasto, COUNT(*) AS total
            FROM Ordenes
            WHERE Estado NOT IN ('CANCELADO', 'Finalizado', 'Entregado')
        `;

        if (area && area !== 'TODOS') {
            query += ` AND AreaID = @AreaID`;
            request.input('AreaID', sql.VarChar, area);
        }

        query += ` GROUP BY ISNULL(EstadoLogistica, 'Canasto Produccion')`;

        const result = await request.query(query);
        res.json({ success: true, canastos: result.recordset });
    } catch (err) {
        logger.error('Error en getCanastosResumen:', err);
        res.status(500).json({ error: 'Error al obtener resumen de canastos', details: err.message });
    }
};

// Obtener listado de órdenes para un canasto específico
const getOrdenesPorCanasto = async (req, res) => {
    try {
        const { canasto, area } = req.query;
        const pool = await getPool();
        const request = pool.request();

        let query = `
            SELECT OrdenID, CodigoOrden, AreaID, Estado, EstadoLogistica, ISNULL(Cliente, '') as Cliente
            FROM Ordenes
            WHERE Estado NOT IN ('CANCELADO', 'Finalizado', 'Entregado')
        `;

        if (canasto) {
            query += ` AND ISNULL(EstadoLogistica, 'Canasto Produccion') = @Canasto`;
            request.input('Canasto', sql.VarChar, canasto);
        }

        if (area && area !== 'TODOS') {
            query += ` AND AreaID = @AreaID`;
            request.input('AreaID', sql.VarChar, area);
        }

        const result = await request.query(query);
        res.json({ success: true, ordenes: result.recordset });
    } catch (err) {
        logger.error('Error en getOrdenesPorCanasto:', err);
        res.status(500).json({ error: 'Error al obtener órdenes del canasto', details: err.message });
    }
};

// Mover órdenes masivamente a otro canasto
const moverOrdenes = async (req, res) => {
    let transaction;
    try {
        const { ordenIds, destinoCanasto } = req.body;
        const userId = req.user?.id || 1;

        if (!ordenIds || !ordenIds.length || !destinoCanasto) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos (ordenIds o destinoCanasto)' });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Evitar inyección creando string de IDs (asumiendo enteros)
        const idsString = ordenIds.filter(id => !isNaN(id)).join(',');

        if (idsString.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'IDs de orden inválidos' });
        }

        const updRes = await new sql.Request(transaction)
            .input('Destino', sql.VarChar, destinoCanasto)
            .query(`UPDATE Ordenes SET EstadoLogistica = @Destino WHERE OrdenID IN (${idsString})`);

        const rowsAffected = updRes.rowsAffected[0];

        // Auditoría por orden
        for (const oId of ordenIds) {
            if (!isNaN(oId)) {
                await new sql.Request(transaction)
                    .input('UID', sql.Int, userId)
                    .input('Accion', sql.NVarChar, 'MOVER_CANASTO')
                    .input('Detalles', sql.NVarChar, `Orden ${oId} movida masivamente al canasto: ${destinoCanasto}`)
                    .query(`INSERT INTO dbo.Auditoria (IdUsuario, Accion, Detalles, DireccionIP, FechaHora) VALUES (@UID, @Accion, @Detalles, '127.0.0.1', GETDATE())`);
            }
        }

        await transaction.commit();

        res.json({ success: true, ordenesActualizadas: rowsAffected, mensaje: 'Órdenes movidas correctamente' });
    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) {}
        }
        logger.error('Error en moverOrdenes:', err);
        res.status(500).json({ error: 'Error al mover órdenes', details: err.message });
    }
};

module.exports = {
    getCanastosResumen,
    getOrdenesPorCanasto,
    moverOrdenes
};
