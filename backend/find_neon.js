const { getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query("SELECT * FROM Clientes WHERE NombreFantasia LIKE '%Neon%' OR Nombre LIKE '%Neon%'");
  console.log(res.recordset);
  
  if (res.recordset.length > 0) {
    const resCuentas = await pool.request().query(`SELECT * FROM CuentasCliente WHERE CliIdCliente = ${res.recordset[0].CliIdCliente}`);
    console.log(resCuentas.recordset);
  }
  process.exit(0);
}
run().catch(console.error);
