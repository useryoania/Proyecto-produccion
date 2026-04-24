const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SINCRO-ARTICULOS'");
        console.table(res.recordset);
        
        // Also get first 5 rows to understand the data
        let rows = await pool.request().query("SELECT TOP 5 * FROM [SINCRO-ARTICULOS]");
        console.dir(rows.recordset, { depth: null });
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
