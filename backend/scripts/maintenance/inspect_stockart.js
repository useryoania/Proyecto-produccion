const { sql, getPool } = require('./config/db');

async function checkStockArt() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'StockArt'
        `);
        console.log("StockArt Columns:", result.recordset.map(r => r.COLUMN_NAME));
    } catch (err) {
        console.error(err);
    }
}

checkStockArt();
