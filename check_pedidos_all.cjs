const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT TOP 5 ID, NoDocERP FROM PedidosCobranza ORDER BY ID DESC");
        console.table(r.recordset);
        const r2 = await pool.request().query("SELECT TOP 5 ID, PedidoCobranzaID, OrdenID, ProIdProducto, DatoTecnico, LogPrecioAplicado FROM PedidosCobranzaDetalle ORDER BY ID DESC");
        console.table(r2.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
