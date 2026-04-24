const { getPool } = require('./config/db');
getPool().then(async pool => {
    const r = await pool.request().query("SELECT IDProdReact, ProIdProducto, CodArticulo, Descripcion FROM Articulos WHERE ProIdProducto=266 OR CodArticulo='7'");
    console.table(r.recordset);
    process.exit(0);
});
