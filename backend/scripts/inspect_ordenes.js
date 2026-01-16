require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const sql = require('mssql');

async function inspect() {
    try {
        const pool = await getPool();
        // Get columns of Ordenes
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Ordenes'
        `);
        console.log("Columnas en Ordenes:", result.recordset);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

inspect();
