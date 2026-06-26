'use strict';

const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');

/**
 * GET /api/profiles/urgencia-excepciones
 * Lista todas las excepciones activas con nombre de cliente y artículo.
 */
exports.getExcepciones = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                ue.ID,
                ue.CliIdCliente,
                c.Nombre        AS ClienteNombre,
                ue.ProIdProducto,
                a.Descripcion   AS ArticuloNombre,
                a.CodArticulo,
                ue.Descripcion,
                ue.FechaAlta
            FROM dbo.UrgenciaExcepciones ue
            JOIN dbo.Clientes  c WITH(NOLOCK) ON c.CliIdCliente  = ue.CliIdCliente
            LEFT JOIN dbo.Articulos a WITH(NOLOCK) ON a.ProIdProducto = ue.ProIdProducto
            WHERE ue.Activo = 1
            ORDER BY c.Nombre, a.Descripcion
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        logger.error('[UrgenciaExcepciones] getExcepciones:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * POST /api/profiles/urgencia-excepciones
 * Agrega una excepción.
 * Body: { CliIdCliente, ProIdProducto? (null = cliente completo), Descripcion? }
 */
exports.addExcepcion = async (req, res) => {
    const { CliIdCliente, ProIdProducto = null, Descripcion = null } = req.body;
    const UsuarioAlta = req.user?.id ?? 1;

    if (!CliIdCliente) {
        return res.status(400).json({ success: false, error: 'CliIdCliente es obligatorio.' });
    }

    try {
        const pool = await getPool();
        await pool.request()
            .input('CliId', sql.Int,           parseInt(CliIdCliente))
            .input('ProId', sql.Int,           ProIdProducto ? parseInt(ProIdProducto) : null)
            .input('Desc',  sql.NVarChar(200), Descripcion || null)
            .input('Usr',   sql.Int,           UsuarioAlta)
            .query(`
                IF NOT EXISTS (
                    SELECT 1 FROM dbo.UrgenciaExcepciones
                    WHERE CliIdCliente = @CliId
                      AND ((@ProId IS NULL AND ProIdProducto IS NULL) OR ProIdProducto = @ProId)
                      AND Activo = 1
                )
                INSERT INTO dbo.UrgenciaExcepciones
                    (CliIdCliente, ProIdProducto, Descripcion, Activo, FechaAlta, UsuarioAlta)
                VALUES
                    (@CliId, @ProId, @Desc, 1, GETDATE(), @Usr)
                ELSE
                    RAISERROR('Ya existe una excepción para ese cliente y servicio.', 16, 1)
            `);
        res.json({ success: true, message: 'Excepción registrada.' });
    } catch (err) {
        logger.error('[UrgenciaExcepciones] addExcepcion:', err.message);
        const status = err.message.includes('Ya existe') ? 409 : 500;
        res.status(status).json({ success: false, error: err.message });
    }
};

/**
 * DELETE /api/profiles/urgencia-excepciones/:id
 * Elimina (desactiva) una excepción por su ID.
 */
exports.deleteExcepcion = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('ID', sql.Int, parseInt(id))
            .query(`UPDATE dbo.UrgenciaExcepciones SET Activo = 0 WHERE ID = @ID`);
        res.json({ success: true, message: 'Excepción eliminada.' });
    } catch (err) {
        logger.error('[UrgenciaExcepciones] deleteExcepcion:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};
