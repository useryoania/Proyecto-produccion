const db = require('./config/db.js');
(async () => {
    try {
        const pool = await db.getPool();
        const result = await pool.request().query("SELECT * FROM dbo.DocumentosContablesDetalle WHERE OrdCodigoOrden = 'XSB-62799'");
        console.dir(result.recordset, { depth: null });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
