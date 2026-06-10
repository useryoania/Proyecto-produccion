const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT TOP 10 MovIdMovimiento, CueIdCuenta, MovTipo, MovConcepto, MovFecha 
    FROM MovimientosCuenta 
    ORDER BY MovIdMovimiento DESC
  `);
  console.log(res.recordset);
  process.exit(0);
}
run().catch(console.error);
