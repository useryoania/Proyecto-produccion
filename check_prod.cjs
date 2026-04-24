const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT TOP 3 pcd.ProIdProducto, pr.ProNombre FROM PedidosCobranzaDetalle pcd LEFT JOIN Productos pr ON pr.ProIdProducto = pcd.ProIdProducto WHERE pcd.ProIdProducto IS NOT NULL");
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
