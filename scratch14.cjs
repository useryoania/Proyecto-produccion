const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT * FROM sys.tables WHERE name LIKE '%Configuracion%'")
).then(res => { 
    console.log(res.recordset); 
    process.exit(0); 
}).catch(e => console.error(e));
