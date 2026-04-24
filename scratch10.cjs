const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT TOP 1 * FROM Ordenes")
).then(res => { 
    console.log('Orden:', res.recordset[0]); 
    process.exit(0); 
}).catch(e => console.error(e));
