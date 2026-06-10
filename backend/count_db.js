const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`SELECT COUNT(1) as count FROM CuentasCliente`);
  console.log('CuentasCliente:', res.recordset);
  const res2 = await pool.request().query(`SELECT COUNT(1) as count FROM MovimientosCuenta`);
  console.log('MovimientosCuenta:', res2.recordset);
  const res3 = await pool.request().query(`SELECT COUNT(1) as count FROM Ordenes`);
  console.log('Ordenes:', res3.recordset);
  process.exit(0);
}
run().catch(console.error);
