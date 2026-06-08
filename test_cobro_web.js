const sql = require('mssql');
const { getPool } = require('./backend/config/db');

async function checkDb() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM dbo.Config_TiposDocumento WHERE CodDocumento = 'COBRO_WEB'");
    console.log("Config_TiposDocumento:", result.recordset);

    const tcaRes = await pool.request().query("SELECT COUNT(*) as count FROM dbo.TransaccionesCaja WHERE TcaTipoDocumento = 'COBRO_WEB'");
    console.log("Count in TransaccionesCaja:", tcaRes.recordset[0].count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDb();
