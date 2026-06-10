const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT TOP 1 * FROM Ordenes
  `);
  console.log(Object.keys(res.recordset[0]));
  const res2 = await pool.request().query(`
    SELECT OrdenID, CodigoOrden, ClienteID, CostoFinal, Estado 
    FROM Ordenes 
    WHERE CodigoOrden IN ('DF-101083', 'DF-101079', 'DF-101078')
  `);
  console.log(res2.recordset);
  process.exit(0);
}
run().catch(console.error);
