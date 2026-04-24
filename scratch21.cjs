const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DocumentosContables'");
        console.log(res.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}).catch(e => console.error(e));
