const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT * FROM ConfiguracionGlobal WHERE Clave LIKE '%ESTAMPADO%' OR Clave LIKE '%BORDADO%'")
).then(res => { 
    console.log(res.recordset); 
    process.exit(0); 
}).catch(e => console.error(e));
