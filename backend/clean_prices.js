const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== Iniciando purga de precios huérfanos ==");
        
        // 1. Borrar Precios Huérfanos
        let rawDelt = await pool.request().query(`
            DELETE FROM PreciosBase
            WHERE ProIdProducto NOT IN (SELECT ProIdProducto FROM Articulos)
        `);
        console.log(`✅ ${rawDelt.rowsAffected[0]} precios huérfanos borrados con éxito.`);

        // 2. Extraer catálogo completo vigente para revisión
        let resList = await pool.request().query(`
            SELECT PB.ID as PrecioID, A.CodArticulo as CodigoOriginal, PB.ProIdProducto, A.Descripcion, PB.Precio, PB.MonIdMoneda
            FROM PreciosBase PB
            INNER JOIN Articulos A ON PB.ProIdProducto = A.ProIdProducto
            ORDER BY A.Descripcion ASC
        `);
        
        console.log("\n== LISTADO DE PRECIOS BASE ACTIVOS Y VINCULADOS (" + resList.recordset.length + " restantes) ==");
        console.table(resList.recordset.slice(0, 100)); // Mostrar primeros 100 para no ahogar consola
        if (resList.recordset.length > 100) {
            console.log(`...y ${resList.recordset.length - 100} productos más.`);
        }

    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
