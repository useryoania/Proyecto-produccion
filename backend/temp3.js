const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT * FROM dbo.ConfigMapeoERP");
  console.log(r.recordset);
  process.exit(0);
}
main().catch(console.error);
