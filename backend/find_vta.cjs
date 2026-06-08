const sql = require('mssql');
const { getPool } = require('./config/db');

async function run() {
  try {
    const pool = await getPool();
    let res = await pool.request().query("SELECT * FROM dbo.Config_TiposDocumento");
    console.log("Config_TiposDocumento matches:", res.recordset);

    res = await pool.request().query("SELECT TOP 5 * FROM dbo.SecuenciaDocumentos");
    console.log("Secuencias matches:", res.recordset);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
