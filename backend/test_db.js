const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT TOP 1 * FROM dbo.Articulos");
  console.log("Articulos columns:", Object.keys(r.recordset[0] || {}));
  const r2 = await pool.request().query("SELECT TOP 1 * FROM dbo.PreciosListaPublica");
  console.log("Precios columns:", Object.keys(r2.recordset[0] || {}));
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
