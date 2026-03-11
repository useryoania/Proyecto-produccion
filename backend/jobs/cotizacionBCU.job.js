const axios = require('axios');
const { getPool, sql } = require('../config/db');

// ── BCU API (Banco Central del Uruguay) ──────────────────────────────────────
// Moneda 2222 = Dólar USA | Fecha formato: DDMMYYYY
// Devuelve compra y venta del día. Usamos el promedio (o solo venta si preferís).
const BCU_URL = 'https://cotizaciones.bcu.gub.uy/wscotizaciones/ServicioCotizaciones.svc/getCotizaciones';

function fechaBCU(d = new Date()) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}${mm}${yyyy}`;
}

async function fetchCotizacionBCU() {
    const fecha = fechaBCU();
    const url = `${BCU_URL}?Moneda=2222&Fecha=${fecha}&Rows=1&idPadre=0&Cab=S`;

    const { data } = await axios.get(url, {
        timeout: 15000,
        headers: { Accept: 'application/json' }
    });

    // Respuesta esperada: { tipocambio: [{ Fecha, TCC, TCN }] }
    // TCC = precio compra, TCN = precio venta
    const rows = data?.tipocambio;
    if (!rows || rows.length === 0) throw new Error('BCU no devolvió datos de cotización');

    const venta = parseFloat(rows[0].TCN ?? rows[0].TCC);
    if (!isFinite(venta) || venta <= 0) throw new Error(`Cotización inválida: ${JSON.stringify(rows[0])}`);

    return venta;
}

async function runCotizacionJob() {
    try {
        const pool = await getPool();

        // Verificar si ya se insertó hoy
        const check = await pool.request().query(`
            SELECT COUNT(*) AS cnt FROM Cotizaciones WITH(NOLOCK)
            WHERE CONVERT(DATE, CotFecha) = CONVERT(DATE, GETDATE())
        `);
        if (check.recordset[0].cnt > 0) {
            console.log('[COTIZACION JOB] Ya existe cotización para hoy. Saltando.');
            return;
        }

        // Obtener del BCU
        const cotizacion = await fetchCotizacionBCU();

        // Insertar en DB
        await pool.request()
            .input('cot', sql.Float, cotizacion)
            .query(`INSERT INTO Cotizaciones (CotFecha, CotDolar) VALUES (GETDATE(), @cot)`);

        console.log(`[COTIZACION JOB] ✅ Cotización BCU insertada: $U ${cotizacion}`);

    } catch (err) {
        console.error('[COTIZACION JOB] ❌ Error:', err.message);
    }
}

// ── Scheduler: corre a las 09:10 y 10:30 (por si BCU tarda en publicar) ──────
function startCotizacionJob() {
    const cron = require('node-cron');

    // 09:10 AM hora Uruguay
    cron.schedule('10 9 * * 1-5', () => {
        console.log('[COTIZACION JOB] Ejecutando (09:10 lun-vie)...');
        runCotizacionJob();
    }, { timezone: 'America/Montevideo' });

    // 10:30 AM como respaldo (por si el BCU no publicó aún a las 9)
    cron.schedule('30 10 * * 1-5', () => {
        console.log('[COTIZACION JOB] Ejecutando respaldo (10:30 lun-vie)...');
        runCotizacionJob();
    }, { timezone: 'America/Montevideo' });

    console.log('⏱️ [CRON] Cotización BCU: Activado (09:10 y 10:30, Lun-Vie).');
}

module.exports = { startCotizacionJob, runCotizacionJob };
