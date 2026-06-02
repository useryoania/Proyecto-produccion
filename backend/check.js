const { getPool } = require('./config/db');
async function run() {
    const pool = await getPool();
    const r = await pool.request().query("SELECT Detalle, CodDocumento FROM Config_TiposDocumento WHERE CodDocumento IN ('10', '04', '110', '112', '101', '102', '07', '08')");
    console.dir(r.recordset);
    process.exit(0);
}
run();
