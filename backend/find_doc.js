const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT DocIdDocumento, DocTipo, DocNumero, DocEstado, CicIdCiclo
    FROM DocumentosContables
    WHERE CueIdCuenta = 2701 AND DocTipo = 'E-TICKET CREDITO'
    ORDER BY DocIdDocumento DESC
  `);
  console.log(JSON.stringify(res.recordset, null, 2));
  process.exit(0);
}
run().catch(console.error);
