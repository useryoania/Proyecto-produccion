const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT t.name, s.name as schema_name FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name IN ('ImputacionPago', 'TransaccionesCaja')");
  console.log(r.recordset);
  process.exit(0);
}
main().catch(console.error);
