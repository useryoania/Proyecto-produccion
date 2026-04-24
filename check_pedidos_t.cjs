const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT ID, NoDocERP FROM PedidosCobranza WHERE NoDocERP IN ('TP-213', 'IMD-77')");
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
