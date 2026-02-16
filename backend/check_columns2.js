const { getPool } = require('./config/db');

async function checkColumns() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ArchivosOrden'");
        console.log("ArchivosOrden Columns:", result.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkColumns();
