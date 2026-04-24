const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const res = await pool.request().query("SELECT name FROM sys.tables WHERE name LIKE '%Factura%' OR name LIKE '%Deuda%' OR name LIKE '%Caja%' OR name LIKE '%Contabilidad%' OR name LIKE '%Documento%'");
        console.log(res.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));
