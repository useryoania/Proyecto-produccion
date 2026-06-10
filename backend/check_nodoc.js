const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT OrdenID, CodigoOrden, NoDocERP FROM Ordenes WHERE CodigoOrden = 'DF-101083'
  `);
  console.log('Ordenes:', res.recordset);
  process.exit(0);
}
run().catch(console.error);
