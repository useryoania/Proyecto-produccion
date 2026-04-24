const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== PROIDPRODUCTO = 55 ==");
        let rArt = await pool.request().query("SELECT ProIdProducto, CodArticulo, Descripcion FROM Articulos WHERE ProIdProducto = 55");
        console.table(rArt.recordset);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
});
