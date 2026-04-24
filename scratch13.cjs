const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT * FROM PreciosBase PB INNER JOIN Articulos A ON PB.ProIdProducto = A.ProIdProducto WHERE A.CodArticulo = '110' OR A.Descripcion LIKE '%Estampado%'")
).then(res => { 
    console.log('Precios Base Estampado:', res.recordset); 
    return getPool().then(p => p.request().query("SELECT * FROM PerfilesItems PI INNER JOIN PerfilesPrecios PP ON PI.PerfilID = PP.ID WHERE PI.ProIdProducto IN (SELECT ProIdProducto FROM Articulos WHERE CodArticulo = '110' OR Descripcion LIKE '%Estampado%') OR PP.Categoria = 'EST'"));
}).then(res => { 
    console.log('Perfiles Estampado:', res.recordset); 
    process.exit(0); 
}).catch(e => console.error(e));
