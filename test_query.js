const { getPool } = require('./backend/config/db');

getPool().then(p => {
    p.request().query(`
        SELECT TOP 1 
            p.ID as PedidoID, d.CodArticulo as wms_variante_id, awv.sku 
        FROM PedidosCobranza p 
        INNER JOIN PedidosCobranzaDetalle d ON p.ID = d.PedidoCobranzaID 
        LEFT JOIN Articulos_WMS_Variantes awv ON CAST(awv.wms_variante_id AS VARCHAR(100)) = CAST(d.CodArticulo AS VARCHAR(100))
        WHERE p.NoDocERP LIKE 'VEN-%' 
          AND p.EstadoCobro IN ('PENDIENTE', 'EN_PREPARACION')
        ORDER BY p.FechaGeneracion ASC
    `).then(r => {
        console.log("Success:", r.recordset);
        process.exit();
    }).catch(e => {
        console.log("Query Error:", e.message);
        process.exit();
    });
}).catch(e => {
    console.log("Pool Error:", e.message);
    process.exit();
});
