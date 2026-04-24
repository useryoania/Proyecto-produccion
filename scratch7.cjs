const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT * FROM PreciosEspeciales WHERE CliIdCliente = 1886")
).then(res => { 
    console.log('Assigned:', res.recordset); 
    process.exit(0); 
}).catch(e => console.error(e));
