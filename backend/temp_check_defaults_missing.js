const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT TABLE_NAME, COLUMN_NAME, COLUMN_DEFAULT FROM [Base yoa].INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('AutorizacionesSinPago', 'ImputacionPago', 'CondicionesPago', 'TiposMovimiento', 'TransaccionDetalle') AND COLUMN_DEFAULT IS NOT NULL");
        console.log('Defaults esperados:', q.recordset);
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
