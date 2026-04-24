const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query(`
            SELECT 
                td.TdeCodigoReferencia,
                pcd.OrdenID,
                'Producción - ' + ISNULL(CAST(pcd.OrdenID AS VARCHAR), CAST(td.TdeCodigoReferencia AS VARCHAR)) AS NomItem,
                ISNULL(CAST(pcd.DatoTecnico AS VARCHAR(1000)), CAST(td.TdeDescripcion AS VARCHAR(1000))) AS DscItem,
                ISNULL(pcd.Cantidad, 1) AS Cantidad,
                ISNULL(pcd.PrecioUnitario, td.TdeImporteFinal / 1.22) AS PrecioUnitario,
                ISNULL(pcd.Subtotal, td.TdeImporteFinal / 1.22) AS Subtotal,
                ISNULL(pcd.Subtotal * 0.22, (td.TdeImporteFinal / 1.22) * 0.22) AS Impuestos,
                ISNULL(pcd.Subtotal * 1.22, td.TdeImporteFinal) AS Total
            FROM dbo.TransaccionDetalle td
            LEFT JOIN dbo.PedidosCobranza pc ON pc.NoDocERP = td.TdeCodigoReferencia
            LEFT JOIN dbo.PedidosCobranzaDetalle pcd ON pcd.PedidoCobranzaID = pc.ID
            WHERE td.TcaIdTransaccion = 17
        `);
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
