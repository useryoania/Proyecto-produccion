const db = require('./config/db.js');
(async () => {
    try {
        const pool = await db.getPool();
        const result = await pool.request().query(`
    SELECT TOP (10)
      m.MovIdMovimiento,
      m.MovTipo,
      m.MovImporte,
      oa.CodigoOrdenStr,
      oa.CodigoOrdenStr AS OrdCodigoOrden,
      oa.NombreTrabajo AS OrdNombreTrabajo,
      (
         SELECT d.ID AS DetalleID, a.CodArticulo, d.Cantidad, d.PrecioUnitario, d.Subtotal, d.LogPrecioAplicado, a.Descripcion, pc.Moneda, a.CodStock, sa.Articulo AS ArticuloNombre
         FROM dbo.PedidosCobranza pc WITH(NOLOCK)
         JOIN dbo.PedidosCobranzaDetalle d WITH(NOLOCK) ON pc.ID = d.PedidoCobranzaID
         LEFT JOIN dbo.Articulos a WITH(NOLOCK) ON a.ProIdProducto = d.ProIdProducto
         LEFT JOIN dbo.StockArt sa WITH(NOLOCK) ON a.CodStock = sa.CodStock
         WHERE LTRIM(RTRIM(pc.NoDocERP)) = oa.CodigoOrdenStr
         FOR JSON PATH
      ) AS DetallesJSON
    FROM dbo.MovimientosCuenta m WITH(NOLOCK)
    OUTER APPLY (
      SELECT COALESCE(
        (SELECT TOP 1 CodigoOrden FROM dbo.Ordenes WITH(NOLOCK) WHERE OrdenID = m.OrdIdOrden),
        (SELECT TOP 1 OrdCodigoOrden FROM dbo.OrdenesDeposito WITH(NOLOCK) WHERE OrdIdOrden = m.OrdIdOrden),
        (SELECT TOP 1 OrdCodigoOrden FROM dbo.OrdenesDeposito WITH(NOLOCK) WHERE OReIdOrdenRetiro = m.OReIdOrdenRetiro),
        m.MovRefExterna
      ) AS CodigoOrdenStr,
      COALESCE(
        (SELECT TOP 1 DescripcionTrabajo FROM dbo.Ordenes WITH(NOLOCK) WHERE OrdenID = m.OrdIdOrden),
        (SELECT TOP 1 OrdNombreTrabajo FROM dbo.OrdenesDeposito WITH(NOLOCK) WHERE OrdIdOrden = m.OrdIdOrden)
      ) AS NombreTrabajo
    ) oa
    WHERE m.MovTipo = 'ORDEN'
    ORDER BY m.MovIdMovimiento DESC
        `);
        console.dir(result.recordset, { depth: null });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
