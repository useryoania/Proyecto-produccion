const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let rCols = await pool.request().query("SELECT TOP 1 * FROM [SINCRONIZAR DATOS SISTEMAS - SINCRO]");
        console.log(Object.keys(rCols.recordset[0] || {}));
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
});
