const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query("SELECT ProIdProducto, CodArticulo, Descripcion, IDProdReact FROM Articulos WHERE LTRIM(RTRIM(CAST(CodArticulo AS VARCHAR))) IN ('112', '111', '109', '115')");
        console.table(res.recordset);
        process.exit(0);
    } catch(e){
        console.error(e);
        process.exit(1);
    }
});
