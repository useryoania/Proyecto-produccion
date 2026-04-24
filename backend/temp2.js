const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT COLUMN_NAME, is_identity FROM sys.columns WHERE object_id = object_id('dbo.Articulos') AND name = 'ProIdProducto'");
  console.log(r.recordset);
  process.exit(0);
}
main().catch(console.error);
