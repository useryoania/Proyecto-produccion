const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT TOP 3 ArtIdArticulo, ArtNombre FROM Articulos");
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
