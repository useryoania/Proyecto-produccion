const { getPool, sql } = require('./config/db');
async function test() {
    try {
        const pool = await getPool();
        const qs = await pool.request().query("SELECT top 5 c.CliIdCliente, c.Nombre, c.IDReact, c.IDCliente FROM Clientes c WHERE c.IDReact IN ('46', '47')");
        console.dir(qs.recordset);
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
test();
