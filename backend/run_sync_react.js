const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
        let res = await new sql.Request(transaction).query(`
            UPDATE S
            SET 
                S.PROIDPRODUCTO = A.ProIdProducto,
                S.codArticulo = LTRIM(RTRIM(CAST(A.CodArticulo AS VARCHAR))),
                S.Material = LTRIM(RTRIM(CAST(A.Descripcion AS VARCHAR)))
            FROM [SINCRO-ARTICULOS] S
            INNER JOIN Articulos A ON S.IDREACT = A.IDProdReact
            WHERE S.PROIDPRODUCTO <> A.ProIdProducto 
               OR CAST(S.codArticulo AS VARCHAR) <> LTRIM(RTRIM(CAST(A.CodArticulo AS VARCHAR)))
               OR LTRIM(RTRIM(S.Material)) <> LTRIM(RTRIM(A.Descripcion))
               OR S.PROIDPRODUCTO IS NULL
               OR S.codArticulo IS NULL
               OR S.Material IS NULL
        `);
        
        console.log("Registros actualizados por IDREACT:", res.rowsAffected);
        
        await transaction.commit();
        console.log("Sincronización por IDREACT completada.");
    } catch(e) {
        await transaction.rollback();
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
});
