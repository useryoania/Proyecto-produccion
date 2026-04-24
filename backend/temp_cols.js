const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SesionesTurno'");
        console.log('Columns:', q.recordset);
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
