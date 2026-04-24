const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT TABLE_NAME, COLUMN_NAME FROM [Base yoa].INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME IN ('AutorizacionesSinPago', 'ImputacionPago', 'CondicionesPago', 'TiposMovimiento', 'TransaccionDetalle')");
        console.log('PKs:', q.recordset);
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
