const { getPool } = require('./config/db');

async function listColumns() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Ordenes'
        `);
        console.log("Columnas de Ordenes:", result.recordset.map(r => r.COLUMN_NAME));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listColumns();
