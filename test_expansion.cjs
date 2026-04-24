const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query(`
            SELECT 
                td.TdeCodigoReferencia,
                ISNULL(od.OrdCodigoOrden, td.TdeCodigoReferencia) AS FinalCode,
                LEFT(ISNULL(CAST(pcd.DatoTecnico AS VARCHAR(1000)), td.TdeDescripcion) + ISNULL(' | Perfil: ' + pcd.PerfilAplicado, ''), 1000) AS Descripcion,
                ISNULL(pcd.Cantidad, ISNULL(od.OrdCantidad, 1)) AS Cantidad,
                ISNULL(pcd.PrecioUnitario, ISNULL(pcd.Subtotal, ISNULL(od.OrdCostoFinal, td.TdeImporteFinal)) / NULLIF(ISNULL(pcd.Cantidad, ISNULL(od.OrdCantidad, 1)), 0)) AS PrecioUnitario,
                ISNULL(pcd.Subtotal, ISNULL(od.OrdCostoFinal, td.TdeImporteFinal)) AS Subtotal
            FROM dbo.TransaccionDetalle td
            LEFT JOIN dbo.RelOrdenesRetiroOrdenes rel ON rel.OReIdOrdenRetiro = td.TdeReferenciaId AND td.TdeTipoReferencia = 'ORDEN_RETIRO'
            LEFT JOIN dbo.OrdenesDeposito od ON 
                (td.TdeTipoReferencia = 'ORDEN_RETIRO' AND od.OrdIdOrden = rel.OrdIdOrden)
                OR (td.TdeTipoReferencia = 'ORDEN_DEPOSITO' AND od.OrdIdOrden = td.TdeReferenciaId)
            LEFT JOIN dbo.PedidosCobranza pc ON pc.NoDocERP = ISNULL(od.OrdCodigoOrden, CAST(td.TdeCodigoReferencia AS VARCHAR(100)))
            LEFT JOIN dbo.PedidosCobranzaDetalle pcd ON pcd.PedidoCobranzaID = pc.ID OR CAST(pcd.OrdenID AS VARCHAR) = od.OrdCodigoOrden
            WHERE td.TcaIdTransaccion = 17
        `);
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
