const db = require('./config/db.js');
(async () => {
    try {
        const pool = await db.getPool();
        const result = await pool.request().query("SELECT * FROM dbo.PedidosCobranza WHERE NoDocERP LIKE '%63083%'");
        console.dir(result.recordset, { depth: null });
        
        const result2 = await pool.request().query("SELECT * FROM dbo.OrdenesDeposito WHERE OrdCodigoOrden LIKE '%63083%'");
        console.dir(result2.recordset, { depth: null });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
