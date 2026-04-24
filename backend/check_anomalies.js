const { getPool } = require('./config/db');

getPool().then(async pool => {
    try {
        console.log("== 1. Huerfanos en PreciosBase (ID en Precio pero NO en Articulos) ==");
        let res1 = await pool.request().query(`
            SELECT PB.ID as PrecioID, PB.ProIdProducto, PB.Precio, PB.MonIdMoneda 
            FROM PreciosBase PB 
            LEFT JOIN Articulos A ON PB.ProIdProducto = A.ProIdProducto 
            WHERE A.ProIdProducto IS NULL
        `);
        console.table(res1.recordset);

        console.log("\n== 2. Posibles Cruces Raros (El CodArticulo puro-numerico no coincide con ProIdProducto) ==");
        let res2 = await pool.request().query(`
            SELECT PB.ID as PrecioID, PB.ProIdProducto as IDInterno_Del_Precio, 
                   LTRIM(RTRIM(A.CodArticulo)) as Codigo_Texto_Comercial, 
                   A.Descripcion, PB.Precio 
            FROM PreciosBase PB 
            JOIN Articulos A ON PB.ProIdProducto = A.ProIdProducto
            WHERE ISNUMERIC(LTRIM(RTRIM(A.CodArticulo))) = 1 
              AND CAST(LTRIM(RTRIM(A.CodArticulo)) AS FLOAT) != A.ProIdProducto
        `);
        console.table(res2.recordset);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
