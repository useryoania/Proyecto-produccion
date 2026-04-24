const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT * FROM Articulos WHERE CodArticulo LIKE '%1607%'")
).then(res => { 
    console.log('Articulo:', res.recordset); 
    process.exit(0); 
}).catch(e => console.error(e));
