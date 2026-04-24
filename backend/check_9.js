const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT ProIdProducto, CodArticulo, Descripcion
            FROM Articulos 
            WHERE LTRIM(RTRIM(CAST(CodArticulo AS VARCHAR))) IN ('9', '99999', '999999')
        `);
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
