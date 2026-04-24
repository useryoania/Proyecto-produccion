const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT name FROM sys.tables");
  console.log('Tables:', r.recordset.map(x=>x.name).join(', '));
  process.exit(0);
}
main().catch(console.error);
