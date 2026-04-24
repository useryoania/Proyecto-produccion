const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        let res = await pool.request().query(`
            SELECT 
                S.Material, 
                S.IDREACT AS Sincro_IdReact,
                A.Descripcion AS Art_Desc,
                A.IDProdReact AS Art_IdReact,
                A.ProIdProducto
            FROM [SINCRO-ARTICULOS] S
            CROSS APPLY (
                SELECT TOP 1 * FROM Articulos 
                WHERE Descripcion LIKE '%' + LTRIM(RTRIM(S.Material)) + '%'
                   OR LTRIM(RTRIM(S.Material)) LIKE '%' + LTRIM(RTRIM(Descripcion)) + '%'
            ) A
            WHERE S.IDREACT IN (231, 212, 213, 214, 215, 217, 218, 65, 248)
        `);
        console.table(res.recordset);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
