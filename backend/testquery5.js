const { sql, getPool } = require('./config/db.js');
(async () => {
    try {
        const pool = await getPool();
        const r = await pool.request().query("SELECT CodArticulo, ProIdProducto FROM Articulos WHERE LTRIM(RTRIM(CodArticulo)) = (SELECT LTRIM(RTRIM(CodArticulo)) FROM Ordenes WHERE OrdenID = 10545)");
        console.dir(r.recordset);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
