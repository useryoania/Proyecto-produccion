const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT ProIdProducto, CodArticulo, Descripcion, IDProdReact 
            FROM Articulos 
            WHERE Descripcion LIKE '%Doble Cara%'
        `);
        console.table(res.recordset);
    } catch(e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
});
