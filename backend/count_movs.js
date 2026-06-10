const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT COUNT(1) as count FROM MovimientosCuenta
  `);
  console.log(res.recordset);
  process.exit(0);
}
run().catch(console.error);
