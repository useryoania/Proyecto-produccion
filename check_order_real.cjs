const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r1 = await pool.request().query("SELECT OrdIdOrden, OrdCodigoOrden, OrdNombreTrabajo FROM OrdenesDeposito WHERE OrdIdOrden IN (124611, 124614)");
        console.table(r1.recordset);
        const r2 = await pool.request().query("SELECT ID, PedidoCobranzaID, OrdenID, DatoTecnico, PerfilAplicado, Subtotal FROM PedidosCobranzaDetalle WHERE OrdenID IN (124611, 124614)");
        console.table(r2.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
