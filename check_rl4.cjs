const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT ID, NoDocERP FROM PedidosCobranza WHERE NoDocERP IN ('RL-4', 'RL-5')");
        console.table(r.recordset);
        const r2 = await pool.request().query("SELECT * FROM PedidosCobranzaDetalle WHERE CAST(OrdenID AS VARCHAR) IN ('RL-4', 'RL-5')");
        console.table(r2.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
