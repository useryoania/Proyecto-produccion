const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== 1. ELIMINANDO REGLA 403 (PRECIO FIJO 0) ==");
        let rawDelt = await pool.request().query('DELETE FROM PerfilesItems WHERE ID = 403');
        console.log(`✅ ${rawDelt.rowsAffected[0]} reglas anómalas borradas con éxito.\n`);

        console.log("== 2. REVISION DE TODAS LAS DEMAS REGLAS APLICADAS A PRODUCTOS 'DTF' ==");
        
        // Buscamos cualquier regla conectada a un artículo que contenga "DTF" en su nombre
        let resDTF = await pool.request().query(`
            SELECT PI.ID as ReglaID, A.ProIdProducto, LTRIM(RTRIM(A.Descripcion)) as Descripcion, 
                   PP.Nombre as PerfilNombre, PI.TipoRegla, PI.Valor, PI.CantidadMinima
            FROM PerfilesItems PI
            INNER JOIN PerfilesPrecios PP ON PI.PerfilID = PP.ID
            INNER JOIN Articulos A ON PI.ProIdProducto = A.ProIdProducto
            WHERE A.Descripcion LIKE '%DTF%' AND PP.Activo = 1
            ORDER BY A.ProIdProducto, PI.CantidadMinima ASC
        `);
        
        console.table(resRes = resDTF.recordset);
        if (resDTF.recordset.length === 0) {
            console.log("💡 No se encontraron más reglas de descuento activas para productos DTF.");
        }

    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
