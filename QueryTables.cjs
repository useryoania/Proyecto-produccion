const { sql, getPool } = require('./backend/config/db');

async function Run() {
    const pool = await getPool();
    const r = await pool.request().query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_name = 'PedidosCobranzaDetalle';");
    console.log(r.recordset);
    process.exit(0);
}
Run();
