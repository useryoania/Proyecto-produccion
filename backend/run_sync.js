const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
        let res = await new sql.Request(transaction).query(`
            WITH MatchRecords AS (
                SELECT 
                    S.Material, 
                    A.ProIdProducto, 
                    A.CodArticulo, 
                    A.IDProdReact,
                    ROW_NUMBER() OVER(PARTITION BY LTRIM(RTRIM(S.Material)) ORDER BY A.ProIdProducto ASC) as rn
                FROM [SINCRO-ARTICULOS] S
                INNER JOIN Articulos A ON LTRIM(RTRIM(S.Material)) = LTRIM(RTRIM(A.Descripcion))
                WHERE S.PROIDPRODUCTO <> A.ProIdProducto 
                   OR CAST(S.codArticulo AS VARCHAR) <> LTRIM(RTRIM(CAST(A.CodArticulo AS VARCHAR)))
                   OR S.IDREACT <> A.IDProdReact
                   OR S.PROIDPRODUCTO IS NULL
                   OR S.codArticulo IS NULL
                   OR S.IDREACT IS NULL
            )
            UPDATE S
            SET 
                S.PROIDPRODUCTO = MR.ProIdProducto,
                S.codArticulo = LTRIM(RTRIM(CAST(MR.CodArticulo AS VARCHAR))),
                S.IDREACT = MR.IDProdReact
            FROM [SINCRO-ARTICULOS] S
            INNER JOIN MatchRecords MR ON LTRIM(RTRIM(S.Material)) = LTRIM(RTRIM(MR.Material))
            WHERE MR.rn = 1;
        `);
        
        console.log("Registros actualizados:", res.rowsAffected);
        
        await transaction.commit();
        console.log("Sincronización en la base de datos completada exitosamente.");
    } catch(e) {
        await transaction.rollback();
        console.error("Error actualizando la base de datos:", e);
    } finally {
        process.exit(0);
    }
});
