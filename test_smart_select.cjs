const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query(`
            SELECT 
                td.TdeCodigoReferencia,
                td.TdeTipoReferencia,
                ISNULL(od.OrdCodigoOrden, CAST(pcd.OrdenID AS VARCHAR)) AS RealOrderCode,
                ISNULL(pcd.DatoTecnico, od.OrdNombreTrabajo) AS RealDescription,
                ISNULL(pcd.PerfilAplicado, '') AS PerfilAplicado,
                ISNULL(pcd.Cantidad, od.OrdCantidad) AS RealCantidad,
                ISNULL(pcd.PrecioUnitario, od.OrdCostoFinal / ISNULL(od.OrdCantidad, 1)) AS RealPrecio,
                ISNULL(pcd.Subtotal, od.OrdCostoFinal) AS RealSubtotal
            FROM TransaccionDetalle td
            LEFT JOIN OrdenesDeposito od ON td.TdeTipoReferencia = 'ORDEN_RETIRO' AND od.OReIdOrdenRetiro = td.TdeReferenciaId
            LEFT JOIN PedidosCobranzaDetalle pcd ON CAST(pcd.OrdenID AS VARCHAR) = od.OrdCodigoOrden OR (td.TdeTipoReferencia <> 'ORDEN_RETIRO' AND CAST(pcd.OrdenID AS VARCHAR) = td.TdeCodigoReferencia)
        `);
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
