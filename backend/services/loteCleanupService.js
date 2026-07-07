const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Cancela un lote que quedó sin órdenes ACTIVAS y libera su máquina.
 *
 * "Activa" = Estado NOT IN (Finalizado/CANCELADO/Entregado) y EstadoenArea != Pronto.
 * Cubre tanto lotes físicamente vacíos como lotes cuyas órdenes siguen vinculadas
 * (RolloID intacto) pero ya están todas muertas — el "lote zombie" que queda
 * asignado a una máquina sin nada para imprimir.
 *
 * Correr DESPUÉS del commit de la transacción que mató la última orden (usa el pool).
 * Es no-op si el lote todavía tiene órdenes vivas o si ya está Finalizado/Cerrado/Cancelado.
 *
 * @param {number|string} rolloId
 * @param {object} [io] - socket.io para emitir lotes:updated
 * @returns {Promise<boolean>} true si el lote fue cancelado por esta llamada
 */
async function cancelarLoteSiVacio(rolloId, io) {
    if (!rolloId) return false;
    try {
        const pool = await getPool();
        const res = await pool.request()
            .input('RID', sql.VarChar(50), String(rolloId))
            .query(`
                SELECT COUNT(*) as OrdenesActivas
                FROM dbo.Ordenes
                WHERE CAST(RolloID AS VARCHAR(50)) = @RID
                  AND Estado NOT IN ('Finalizado', 'CANCELADO', 'Entregado')
                  AND ISNULL(EstadoenArea,'') NOT IN ('Pronto', 'PRONTO')
            `);
        if ((res.recordset[0]?.OrdenesActivas || 0) > 0) return false;

        const upd = await pool.request()
            .input('RID', sql.VarChar(50), String(rolloId))
            .query(`
                UPDATE dbo.Rollos
                SET Estado = 'Cancelado', MaquinaID = NULL
                WHERE CAST(RolloID AS VARCHAR(50)) = @RID
                  AND Estado IN ('Abierto', 'En Cola', 'En maquina', 'Pausado')
            `);

        if ((upd.rowsAffected[0] || 0) > 0) {
            logger.info(`[loteCleanup] Lote ${rolloId} quedó sin órdenes activas → cancelado automáticamente.`);
            if (io) io.emit('lotes:updated', { rolloId, action: 'cancelled' });
            return true;
        }
        return false;
    } catch (e) {
        logger.error(`[loteCleanup] Error verificando lote ${rolloId}: ${e.message}`);
        return false;
    }
}

module.exports = { cancelarLoteSiVacio };
