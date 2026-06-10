const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT * FROM PedidosCobranza WHERE NoDocERP = 'DF-101347'
  `);
  console.log('PedidosCobranza DF-101347:', res.recordset);
  
  const res2 = await pool.request().query(`
    SELECT * FROM MovimientosCuenta WHERE MovConcepto LIKE '%DF-101347%'
  `);
  console.log('MovimientosCuenta DF-101347:', res2.recordset);

  // also query Ordenes
  const res3 = await pool.request().query(`
    SELECT * FROM Ordenes WHERE CodigoOrden = 'DF-101347'
  `);
  console.log('Ordenes DF-101347:', res3.recordset.length);

  process.exit(0);
}
run().catch(console.error);
