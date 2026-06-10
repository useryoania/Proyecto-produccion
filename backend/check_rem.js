const { getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query("SELECT * FROM Logistica_Envios WHERE CodigoRemito = 'REM-694379'");
  console.log(res.recordset);
  process.exit(0);
}
run().catch(console.error);
