const { getPool, sql } = require('./config/db');
getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT ProIdProducto, CodArticulo, Descripcion, IDProdReact FROM Articulos WHERE Descripcion LIKE '%Dry Polo%'");
        console.table(res.recordset);
        process.exit(0);
    } catch(e){
        console.error(e);
        process.exit(1);
    }
});
