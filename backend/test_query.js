const db = require('./config/db.js');
(async () => {
    try {
        const pool = await db.getPool();
        const result = await pool.request().query("SELECT (SELECT d.ID AS DetalleID, a.CodArticulo, d.Cantidad, d.PrecioUnitario, d.Subtotal, d.LogPrecioAplicado, a.Descripcion, pc.Moneda, a.CodStock, sa.Articulo AS ArticuloNombre FROM dbo.PedidosCobranza pc WITH(NOLOCK) JOIN dbo.PedidosCobranzaDetalle d WITH(NOLOCK) ON pc.ID = d.PedidoCobranzaID LEFT JOIN dbo.Articulos a WITH(NOLOCK) ON a.ProIdProducto = d.ProIdProducto LEFT JOIN dbo.StockArt sa WITH(NOLOCK) ON a.CodStock = sa.CodStock WHERE LTRIM(RTRIM(pc.NoDocERP)) = 'XSB-62341' FOR JSON PATH) AS DetallesJSON");
        console.log(result.recordset);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
