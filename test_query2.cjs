const { getPool } = require('./backend/config/db');

getPool().then(p => {
    p.request().query("SELECT ProIdProducto, LTRIM(RTRIM(Descripcion)) as Descripcion FROM Articulos WHERE Descripcion LIKE '%Articulos User%'").then(r => {
        console.log("Success:", r.recordset);
        process.exit();
    }).catch(e => {
        console.log("Query Error:", e.message);
        process.exit();
    });
}).catch(e => {
    console.log("Pool Error:", e.message);
    process.exit();
});
