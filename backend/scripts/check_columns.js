const { sql, getPool } = require('../config/db');

async function checkColumns() {
    try {
        const pool = await getPool();
        console.log("--- COLUMNS IN Ordenes ---");
        const resOrd = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Ordenes'
            ORDER BY COLUMN_NAME
        `);
        console.log(resOrd.recordset.map(r => r.COLUMN_NAME).join(', '));

        console.log("\n--- COLUMNS IN Etiquetas ---");
        const resEti = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Etiquetas'
            ORDER BY COLUMN_NAME
        `);
        console.log(resEti.recordset.map(r => r.COLUMN_NAME).join(', '));

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit();
    }
}

checkColumns();
