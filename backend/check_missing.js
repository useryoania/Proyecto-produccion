const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT * FROM PedidosCobranza WHERE NoDocERP IN ('DF-101083', 'DF-101079', 'DF-101078')
  `);
  console.log('PedidosCobranza:', res.recordset);

  // Also check if they exist in MovimientosCuenta
  const res2 = await pool.request().query(`
    SELECT * FROM MovimientosCuenta WHERE MovConcepto LIKE '%DF-101083%' OR MovConcepto LIKE '%DF-101079%' OR MovConcepto LIKE '%DF-101078%'
  `);
  console.log('MovimientosCuenta:', res2.recordset);

  process.exit(0);
}
run().catch(console.error);
