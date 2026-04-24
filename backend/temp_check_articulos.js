const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Articulos'");
        console.log('Articulos Cols:', q.recordset.map(r => r.COLUMN_NAME).join(', '));
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
