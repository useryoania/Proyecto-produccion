const { getPool } = require('./config/db.js');
async function main() {
  const pool = await getPool();
  const r = await pool.request().query(`
      SELECT LTRIM(RTRIM(p.CodArticulo)) as CodArticulo, 
             LTRIM(RTRIM(p.Descripcion)) as Descripcion, 
             ISNULL(c.NombreReferencia, 
                CASE WHEN LTRIM(RTRIM(p.CodStock)) = '2.2.1.1' THEN 'Insumos' 
                     WHEN LTRIM(RTRIM(p.CodStock)) = '2.2.1.2' THEN 'Productos en el local' 
                     ELSE 'Otros' END
             ) as GrupoNombre,
             p.CodStock,
             pl.Precio as PrecioBase,
             pl.Moneda as MonedaBase
      FROM dbo.Articulos p WITH(NOLOCK)
      LEFT JOIN dbo.ConfigMapeoERP c WITH(NOLOCK) ON LTRIM(RTRIM(p.Grupo)) = LTRIM(RTRIM(c.CodigoERP)) COLLATE Database_Default
      LEFT JOIN dbo.PreciosListaPublica pl WITH(NOLOCK) ON p.ProIdProducto = pl.ProIdProducto AND pl.Activo = 1
      WHERE p.Mostrar = 1 AND (p.IDProdReact IS NOT NULL OR p.Grupo = '2.1')
      ORDER BY GrupoNombre, p.Descripcion
  `);
  console.log("Total items:", r.recordset.length);
  const insumos = r.recordset.filter(x => x.GrupoNombre === 'Insumos');
  console.log("Insumos:", insumos.length);
  const productos = r.recordset.filter(x => x.GrupoNombre === 'Productos en el local');
  console.log("Productos:", productos.length);
  process.exit(0);
}
main().catch(console.error);
