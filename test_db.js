const { getPool } = require('./backend/config/db');

async function test() {
    try {
        const pool = await getPool();
        const res = await pool.request().query(`
            SELECT TOP 5 A.CodArticulo, A.Descripcion, A.Precio as ArtPrecio, PB.Precio as PBPrecio, PB.MonIdMoneda 
            FROM Articulos A 
            LEFT JOIN PreciosBase PB ON A.ProIdProducto = PB.ProIdProducto 
            WHERE A.CodArticulo = '8' OR A.Descripcion LIKE '%Dry Microporoso%'
        `);
        console.log(JSON.stringify(res.recordset, null, 2));
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
test();
