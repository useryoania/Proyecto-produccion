const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT ProIdProducto, CodArticulo, IDProdReact, Descripcion 
            FROM Articulos 
            WHERE LTRIM(RTRIM(CAST(CodArticulo AS VARCHAR))) = '9999' 
               OR LTRIM(RTRIM(CAST(CodArticulo AS VARCHAR))) = '99'
        `);
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
