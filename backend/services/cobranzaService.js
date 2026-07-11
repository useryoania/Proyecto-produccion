/**
 * cobranzaService.js — Sincroniza PedidosCobranza con los pagos reales.
 *
 * PedidosCobranza es la vista de cobranza que leen la Caja (pendientes),
 * el portal (badge PAGADO en retiros) y el tótem (decide "pasar por caja").
 * Históricamente NINGÚN flujo de pago la actualizaba: todo quedaba
 * 'Pendiente' para siempre (riesgo de doble cobro, caso DTF-5728).
 *
 * marcarCobranzaPagada se llama desde los caminos vivos que registran pago:
 *   - cajaService.procesarTransaccion (Caja Central + webhooks Handy/MP)
 *   - retiroService.registrarPago (webRetiros)
 * marcarCobranzaPendiente es el inverso, para la anulación de transacciones.
 *
 * Ambas son best-effort: nunca lanzan (un fallo acá no debe tirar el pago).
 */
const { sql } = require('../config/db');
const logger = require('../utils/logger');

// PedidosCobranza.NoDocERP guarda el código base (ej. SUB-4727); en
// OrdenesDeposito el código puede venir con sufijo multiparte (SUB-4727 (2/2)).
// Este fragmento normaliza el código de la orden al código base.
const SQL_CODIGO_BASE = `
    LTRIM(RTRIM(CASE WHEN CHARINDEX(' (', od.OrdCodigoOrden) > 0
        THEN LEFT(od.OrdCodigoOrden, CHARINDEX(' (', od.OrdCodigoOrden) - 1)
        ELSE od.OrdCodigoOrden END))`;

const soloIdsValidos = (ordIds) =>
    (ordIds || []).map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n > 0);

const makeRequest = (db) =>
    typeof db.request === 'function' ? db.request() : new sql.Request(db);

/**
 * Marca 'Pagado' en PedidosCobranza los pedidos de las OrdenesDeposito dadas.
 * Solo pisa filas en 'Pendiente': no toca los estados del flujo WMS ecommerce
 * (EN_PREPARACION/PREPARADO/ENTREGADO/... de los pedidos VEN-) ni re-pisa Pagado.
 *
 * @param {Transaction|Pool} db  — transacción activa (o pool)
 * @param {Array<number>} ordIds — OrdIdOrden de OrdenesDeposito recién pagadas
 */
async function marcarCobranzaPagada(db, ordIds) {
    const ids = soloIdsValidos(ordIds);
    if (!ids.length) return;

    try {
        const request = makeRequest(db);
        ids.forEach((id, i) => request.input(`oid${i}`, sql.Int, id));
        const inClause = ids.map((_, i) => `@oid${i}`).join(',');

        const res = await request.query(`
            UPDATE pc
            SET pc.EstadoCobro = 'Pagado',
                pc.FechaPago   = GETDATE()
            FROM dbo.PedidosCobranza pc
            WHERE UPPER(LTRIM(RTRIM(pc.EstadoCobro))) = 'PENDIENTE'
              AND LTRIM(RTRIM(pc.NoDocERP)) IN (
                    SELECT ${SQL_CODIGO_BASE}
                    FROM dbo.OrdenesDeposito od
                    WHERE od.OrdIdOrden IN (${inClause})
              );
        `);

        const n = res.rowsAffected?.[0] || 0;
        if (n > 0) logger.info(`[COBRANZA] ${n} pedido(s) marcados Pagado (órdenes: ${ids.join(',')})`);
    } catch (err) {
        logger.error(`[COBRANZA] Error marcando Pagado (órdenes ${ids.join(',')}): ${err.message}`);
    }
}

/**
 * Inverso: al anular un pago, la cobranza vuelve de 'Pagado' a 'Pendiente'.
 * Solo pisa filas en 'Pagado' para no interferir con el flujo WMS.
 */
async function marcarCobranzaPendiente(db, ordIds) {
    const ids = soloIdsValidos(ordIds);
    if (!ids.length) return;

    try {
        const request = makeRequest(db);
        ids.forEach((id, i) => request.input(`oid${i}`, sql.Int, id));
        const inClause = ids.map((_, i) => `@oid${i}`).join(',');

        const res = await request.query(`
            UPDATE pc
            SET pc.EstadoCobro = 'Pendiente',
                pc.FechaPago   = NULL
            FROM dbo.PedidosCobranza pc
            WHERE UPPER(LTRIM(RTRIM(pc.EstadoCobro))) = 'PAGADO'
              AND LTRIM(RTRIM(pc.NoDocERP)) IN (
                    SELECT ${SQL_CODIGO_BASE}
                    FROM dbo.OrdenesDeposito od
                    WHERE od.OrdIdOrden IN (${inClause})
              );
        `);

        const n = res.rowsAffected?.[0] || 0;
        if (n > 0) logger.info(`[COBRANZA] ${n} pedido(s) revertidos a Pendiente (órdenes: ${ids.join(',')})`);
    } catch (err) {
        logger.error(`[COBRANZA] Error revirtiendo a Pendiente (órdenes ${ids.join(',')}): ${err.message}`);
    }
}

module.exports = { marcarCobranzaPagada, marcarCobranzaPendiente };
