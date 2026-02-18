const { getPool, sql } = require('../config/db');

async function checkColumns() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT TOP 1 * FROM Ordenes");
        console.log("Columnas en Ordenes:", Object.keys(res.recordset[0]));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkColumns();
