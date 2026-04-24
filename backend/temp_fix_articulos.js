const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        console.log('Agregando UniIdUnidad a Articulos...');
        await pool.request().query("ALTER TABLE Articulos ADD UniIdUnidad INT NULL");
        console.log('Update datos desde Base yoa...');
        await pool.request().query(`
            UPDATE a
            SET a.UniIdUnidad = b.UniIdUnidad
            FROM Articulos a
            JOIN [Base yoa].dbo.Articulos b ON a.ProIdProducto = b.ProIdProducto
            WHERE b.UniIdUnidad IS NOT NULL
        `);
        console.log('Articulos parchado OK!');
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
