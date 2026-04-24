const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT TOP 5 DocIdDocumento, CueIdCuenta, CliIdCliente FROM DocumentosContables WHERE CueIdCuenta IS NOT NULL");
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
}).catch(e => console.error(e));
