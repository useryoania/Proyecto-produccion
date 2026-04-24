const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== PERFILES DE PRECIO Y SUS ITEMS ==");
        let resPerf = await pool.request().query(`
            SELECT PI.ID as ReglaID, PP.Nombre as PerfilNombre, PP.Activo as PerfilActivo, 
                   PI.ProIdProducto as IDInterno_Regla, A.CodArticulo as Codigo_Texto, A.Descripcion, 
                   PI.Valor as Descuento_O_PrecioFijo, PI.CantidadMinima
            FROM PerfilesItems PI
            INNER JOIN PerfilesPrecios PP ON PI.PerfilID = PP.ID
            LEFT JOIN Articulos A ON PI.ProIdProducto = A.ProIdProducto
            ORDER BY PP.Nombre, A.Descripcion
        `);
        console.table(resPerf.recordset.slice(0, 100)); // Show some

        console.log("== SCHEMA DE ARTICULOS ==");
        let resSch = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Articulos'
        `);
        console.table(resSch.recordset);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
