
const { sql, getPool } = require('../config/db');

async function inspectRollosSchema() {
    try {
        const pool = await getPool();
        console.log("Inspecting Rollos Table...");

        const query = `
            SELECT TOP 1 * FROM Rollos
        `;
        const result = await pool.request().query(query);
        if (result.recordset.length > 0) {
            console.log("Columns:", Object.keys(result.recordset[0]));
        } else {
            // Si está vacía, consultamos metadatos
            const meta = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rollos'");
            console.log("Columns (Schema):", meta.recordset.map(r => r.COLUMN_NAME));
        }

    } catch (err) {
        console.error("Error:", err.message);
    }
}

inspectRollosSchema();
