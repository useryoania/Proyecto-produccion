const { getPool, sql } = require('./config/db');
async function test() {
    try {
        const pool = await getPool();
        const qs = await pool.request().query("SELECT TOP 5 OrdIdOrden, OrdCodigoOrden, CliIdCliente, OrdFechaIngresoOrden FROM OrdenesDeposito ORDER BY OrdIdOrden DESC");
        console.dir(qs.recordset);
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
test();
