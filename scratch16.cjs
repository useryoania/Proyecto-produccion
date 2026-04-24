const { getPool } = require('./backend/config/db.js');
getPool().then(pool => 
    pool.request().query("SELECT ID, Nombre FROM PerfilesPrecios WHERE Nombre = 'EMB PRECIOS BORDADO'")
).then(res => { 
    console.log(res.recordset); 
    if(res.recordset.length > 0) {
        return getPool().then(p => p.request().query("SELECT * FROM PerfilesItems WHERE PerfilID = " + res.recordset[0].ID));
    }
    return null;
}).then(res => { 
    if(res) console.log(res.recordset);
    process.exit(0); 
}).catch(e => console.error(e));
