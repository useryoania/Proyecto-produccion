const { getPool, sql } = require('../config/db');

async function checkCodes() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT TOP 20 OrdenID, CodigoOrden, Estado, falla FROM Ordenes ORDER BY OrdenID DESC");
        console.table(res.recordset);
        process.exit(0);
    } catch (e) { console.error(e); }
}
checkCodes();
