const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT name FROM sys.views");
        console.log('Views:', q.recordset);
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
