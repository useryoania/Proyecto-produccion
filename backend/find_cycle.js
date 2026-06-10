const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT TOP 5 c.CicIdCiclo, cl.Nombre, c.CicFechaCierre, c.CicEstado, c.CueIdCuenta
    FROM CiclosCredito c
    JOIN CuentasCliente cc ON c.CueIdCuenta = cc.CueIdCuenta
    JOIN Clientes cl ON cc.CliIdCliente = cl.CliIdCliente
    WHERE cl.Nombre LIKE '%Rodrigo%'
    ORDER BY c.CicIdCiclo DESC
  `);
  console.log(JSON.stringify(res.recordset, null, 2));
  process.exit(0);
}
run().catch(console.error);
