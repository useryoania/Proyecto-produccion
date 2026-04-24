const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT 
                S.Material AS Sincro_Material,
                S.PROIDPRODUCTO AS Sincro_ProId,
                A.ProIdProducto AS Art_ProId,
                S.codArticulo AS Sincro_CodArt,
                A.CodArticulo AS Art_CodArt,
                S.IDREACT AS Sincro_IdReact,
                A.IDProdReact AS Art_IdReact
            FROM [SINCRO-ARTICULOS] S
            LEFT JOIN Articulos A ON LTRIM(RTRIM(S.Material)) = LTRIM(RTRIM(A.Descripcion))
            WHERE 
                S.PROIDPRODUCTO <> A.ProIdProducto 
                OR CAST(S.codArticulo AS VARCHAR) <> LTRIM(RTRIM(CAST(A.CodArticulo AS VARCHAR)))
                OR S.IDREACT <> A.IDProdReact
                OR A.ProIdProducto IS NULL
        `);
        console.table(res.recordset);
        
        let resUnmatched = await pool.request().query(`
            SELECT S.Material
            FROM [SINCRO-ARTICULOS] S
            LEFT JOIN Articulos A ON LTRIM(RTRIM(S.Material)) = LTRIM(RTRIM(A.Descripcion))
            WHERE A.ProIdProducto IS NULL
        `);
        console.log("UNMATCHED IN ARTICULOS:");
        console.table(resUnmatched.recordset);
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
