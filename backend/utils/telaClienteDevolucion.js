const sql = require('mssql');
const logger = require('./logger');

/**
 * TELA CLIENTE — Devuelve a la(s) bobina(s) los metros REALMENTE consumidos por una orden.
 *
 * Fuente de verdad: MovimientosInsumos (CONSUMO_ORDEN de esa orden), NO Ordenes.Magnitud.
 * Así se devuelve exactamente lo que se descontó al crear el pedido, aunque la Magnitud
 * de la orden haya cambiado después (archivos, ediciones, fallas), y las órdenes que nunca
 * consumieron (extras, -F/-R clonadas, órdenes previas al fix del descuento) devuelven 0.
 *
 * Idempotente: si ya existe una DEVOLUCION_CANCELACION para la orden no hace nada,
 * de modo que cancelar dos veces (o por dos caminos distintos) no infla el stock.
 *
 * Debe llamarse DENTRO de la transacción que cancela la orden.
 *
 * @param {sql.Transaction} transaction - transacción activa
 * @param {number} ordenId
 * @param {string} refText - referencia del movimiento (ej. "Devolución por cancelación Orden 123")
 * @param {number} userId
 * @returns {Promise<number>} metros devueltos (0 si no había consumo o ya se devolvió)
 */
async function devolverMetrosTelaCliente(transaction, ordenId, refText, userId) {
    const oid = Number(ordenId);
    if (!Number.isFinite(oid)) return 0;

    // Guarda anti doble devolución
    const dup = await new sql.Request(transaction)
        .input('OID', sql.Int, oid)
        .query("SELECT COUNT(*) AS Cnt FROM MovimientosInsumos WHERE OrdenID = @OID AND TipoMovimiento = 'DEVOLUCION_CANCELACION'");
    if ((dup.recordset[0]?.Cnt || 0) > 0) return 0;

    // Lo realmente consumido por la orden, por bobina (Cantidad se guarda en negativo)
    const cons = await new sql.Request(transaction)
        .input('OID', sql.Int, oid)
        .query(`
            SELECT BobinaID, InsumoID, SUM(-Cantidad) AS Mts
            FROM MovimientosInsumos
            WHERE OrdenID = @OID AND TipoMovimiento = 'CONSUMO_ORDEN' AND BobinaID IS NOT NULL
            GROUP BY BobinaID, InsumoID
        `);

    let totalDevuelto = 0;
    for (const row of cons.recordset) {
        const mts = parseFloat(row.Mts) || 0;
        if (mts <= 0) continue;

        // Devolver metros; si estaba Agotado y ahora quedan > 0.5m → Disponible
        await new sql.Request(transaction)
            .input('BID', sql.Int, row.BobinaID)
            .input('Mts', sql.Decimal(10, 2), mts)
            .query(`
                UPDATE InventarioBobinas
                SET MetrosRestantes = MetrosRestantes + @Mts,
                    Estado = CASE
                        WHEN Estado = 'Agotado' AND (MetrosRestantes + @Mts) > 0.5 THEN 'Disponible'
                        ELSE Estado
                    END
                WHERE BobinaID = @BID
            `);

        await new sql.Request(transaction)
            .input('IID', sql.Int, row.InsumoID)
            .input('BID', sql.Int, row.BobinaID)
            .input('OID', sql.Int, oid)
            .input('Mts', sql.Decimal(10, 2), mts)
            .input('UID', sql.Int, Number(userId) || 1)
            .input('Ref', sql.NVarChar(300), String(refText || `Devolución Orden ${oid}`).substring(0, 300))
            .query(`
                INSERT INTO MovimientosInsumos
                    (InsumoID, BobinaID, TipoMovimiento, Cantidad, Referencia, UsuarioID, OrdenID, FechaMovimiento)
                VALUES (@IID, @BID, 'DEVOLUCION_CANCELACION', @Mts, @Ref, @UID, @OID, GETDATE())
            `);

        totalDevuelto += mts;
        logger.info(`[TELA-CLIENTE] Orden ${oid}: devueltos ${mts}m a bobina ${row.BobinaID}`);
    }
    return totalDevuelto;
}

module.exports = { devolverMetrosTelaCliente };
