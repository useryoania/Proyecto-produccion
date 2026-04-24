const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r1 = await pool.request().query("SELECT * FROM OrdenesDeposito WHERE OrdIdOrden = 124617");
        console.table(r1.recordset);
        const r2 = await pool.request().query("SELECT ID, NoDocERP FROM PedidosCobranza WHERE NoDocERP = 'LONA-88' OR ID IN (SELECT PedidoCobranzaID FROM PedidosCobranzaDetalle WHERE OrdenID = 124617)");
        console.table(r2.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
