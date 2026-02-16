const { getPool } = require('./config/db');

async function checkColumns() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ArchivosReferencia'");
        console.log(result.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkColumns();
