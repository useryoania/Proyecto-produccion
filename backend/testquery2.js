const { sql, getPool } = require('./config/db.js');
(async () => {
    try {
        const pool = await getPool();
        const r = await pool.request().query("SELECT ProIdProducto, CodArticulo FROM Articulos WHERE ProIdProducto IN (SELECT ProIdProducto FROM Articulos GROUP BY ProIdProducto HAVING COUNT(*) > 1)");
        console.dir(r.recordset);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
