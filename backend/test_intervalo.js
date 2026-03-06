const { getPool, sql } = require('./config/db');
async function test() {
    try {
        const pool = await getPool();
        const qs = await pool.request().query("SELECT * FROM ConfiguracionGlobal WHERE Clave = 'IntervaloAviso'");
        console.dir(qs.recordset);
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
test();
