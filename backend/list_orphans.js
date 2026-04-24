const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT 
                S.Material, 
                S.PROIDPRODUCTO, 
                S.codArticulo, 
                S.IDREACT,
                S.AREA
            FROM [SINCRO-ARTICULOS] S
            LEFT JOIN Articulos A ON S.PROIDPRODUCTO = A.ProIdProducto
            WHERE A.ProIdProducto IS NULL
        `);
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
