const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT p.CodArticulo, pl.Precio as PrecioBase, pl.Moneda as MonedaBase FROM dbo.Articulos p LEFT JOIN dbo.PreciosListaPublica pl ON p.ProIdProducto = pl.ProIdProducto WHERE p.CodStock IN ('2.2.1.1', '2.2.1.2')");
  console.log(r.recordset.slice(0, 5));
  process.exit(0);
}
main().catch(console.error);
