const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r2 = await pool.request().query("SELECT ID, NoDocERP FROM PedidosCobranza WHERE NoDocERP LIKE '%58964%' OR NoDocERP LIKE '%SB-58964%'");
        console.table(r2.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
