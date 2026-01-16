
const { sql, getPool } = require('../config/db');

async function inspectOrdenesColumns() {
    try {
        const pool = await getPool();
        const meta = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Ordenes'");
        console.log("Ordenes Columns:", meta.recordset.map(r => r.COLUMN_NAME));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

inspectOrdenesColumns();
