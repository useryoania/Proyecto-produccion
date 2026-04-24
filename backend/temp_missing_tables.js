const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT name FROM [Base yoa].sys.tables WHERE name NOT IN (SELECT name FROM sys.tables)");
        console.log('Missing tables:', q.recordset.map(x=>x.name));
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
