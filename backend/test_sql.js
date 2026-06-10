const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT * FROM PedidosCobranza WHERE NoDocERP = (SELECT TOP 1 CAST(NoDocERP AS VARCHAR) FROM Ordenes WHERE CodigoOrden = 'DF-101083')
  `);
  console.log(res.recordset);
  process.exit(0);
}
run().catch(console.error);
