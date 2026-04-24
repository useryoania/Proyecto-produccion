const { sql, getPool } = require('./config/db.js');
(async () => {
    try {
        const pool = await getPool();
        const r = await pool.request().query("SELECT PCD.ID, PCD.OrdenID, O.CodigoOrden, PCD.CodArticulo FROM PedidosCobranzaDetalle PCD JOIN Ordenes O ON PCD.OrdenID = O.OrdenID WHERE O.CodigoOrden LIKE 'XIMD-55%'");
        console.dir(r.recordset);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
