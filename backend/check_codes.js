const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT ProIdProducto, CodArticulo, IDProdReact, Descripcion FROM Articulos WHERE IDProdReact='111' OR IDProdReact='112'");
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
