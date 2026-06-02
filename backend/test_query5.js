const db = require('./config/db.js');
(async () => {
    try {
        const pool = await db.getPool();
        const result = await pool.request().query("SELECT TOP 5 DocIdDocumento, DocNumero, DocTipo, DocIdDocumentoRef, CfeEstado FROM dbo.DocumentosContables ORDER BY DocIdDocumento DESC");
        console.dir(result.recordset, { depth: null });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
