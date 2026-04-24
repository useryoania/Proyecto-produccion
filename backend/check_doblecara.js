const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== TABLA SINCRO-ARTICULOS (Google Sheets Mappings) ==");
        let resS= await pool.request().query("SELECT TOP 50 PRODUCTO, Material, PROIDPRODUCTO, codArticulo FROM [SINCRO-ARTICULOS] WHERE PRODUCTO LIKE '%Doble Cara%' OR Material LIKE '%Doble Cara%' OR PRODUCTO LIKE '%Blackout%'");
        console.table(resS.recordset);

        console.log("== TABLA ARTICULOS (Base de datos WMS) ==");
        let resA = await pool.request().query("SELECT TOP 50 ProIdProducto, CodArticulo, Descripcion FROM Articulos WHERE Descripcion LIKE '%Doble Cara%' OR Descripcion LIKE '%Blackout%'");
        console.table(resA.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
