const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Articulos'");
        console.table(res.recordset);
        
        let identityCheck = await pool.request().query("SELECT name, is_identity FROM sys.columns WHERE object_id = object_id('Articulos') AND is_identity = 1");
        console.table(identityCheck.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
