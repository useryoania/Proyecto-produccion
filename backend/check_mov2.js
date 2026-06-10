const { getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query("SELECT MovIdMovimiento, MovTipo, MovFecha, DocIdDocumento, CicIdCiclo, MovAnulado FROM MovimientosCuenta WHERE CueIdCuenta = 5");
  console.log(res.recordset);
  process.exit(0);
}
run().catch(console.error);
