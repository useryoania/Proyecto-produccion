const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query(`
            SELECT TOP 5 
                t.TcaIdTransaccion, 
                td.TdeCodigoReferencia, 
                pc.ID, 
                pcd.Cantidad, 
                pcd.PrecioUnitario, 
                pcd.Subtotal, 
                pcd.OrdenID 
            FROM TransaccionesCaja t 
            INNER JOIN TransaccionDetalle td ON t.TcaIdTransaccion = td.TcaIdTransaccion 
            LEFT JOIN PedidosCobranza pc ON pc.NoDocERP = td.TdeCodigoReferencia 
            LEFT JOIN PedidosCobranzaDetalle pcd ON pcd.PedidoCobranzaID = pc.ID
        `);
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
