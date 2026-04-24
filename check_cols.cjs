const { getPool, sql } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DocumentosContables'");
        console.log(r.recordset.map(c=>c.COLUMN_NAME).join(', '));
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));
