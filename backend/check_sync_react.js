const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT 
                S.Material AS Sincro_Material,
                A.Descripcion AS Art_Descripcion,
                S.PROIDPRODUCTO AS Sincro_ProId,
                A.ProIdProducto AS Art_ProId,
                S.codArticulo AS Sincro_CodArt,
                A.CodArticulo AS Art_CodArt,
                S.IDREACT AS IdReact
            FROM [SINCRO-ARTICULOS] S
            INNER JOIN Articulos A ON S.IDREACT = A.IDProdReact
            WHERE 
                S.PROIDPRODUCTO <> A.ProIdProducto 
                OR CAST(S.codArticulo AS VARCHAR) <> LTRIM(RTRIM(CAST(A.CodArticulo AS VARCHAR)))
                OR LTRIM(RTRIM(S.Material)) <> LTRIM(RTRIM(A.Descripcion))
                OR S.PROIDPRODUCTO IS NULL
        `);
        console.table(res.recordset);
        
        let resUnmatched = await pool.request().query(`
            SELECT S.Material, S.IDREACT, S.PROIDPRODUCTO
            FROM [SINCRO-ARTICULOS] S
            LEFT JOIN Articulos A ON S.IDREACT = A.IDProdReact
            WHERE A.ProIdProducto IS NULL AND S.IDREACT IS NOT NULL AND S.IDREACT <> 9999
        `);
        console.log("UNMATCHED IN ARTICULOS BY IDREACT:");
        console.table(resUnmatched.recordset);
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
