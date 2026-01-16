const { getPool } = require('./backend/config/db');
const sql = require('mssql');

async function checkSchema() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rollos'");
        console.log("Columns in Rollos:", result.recordset.map(row => row.COLUMN_NAME));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkSchema();
