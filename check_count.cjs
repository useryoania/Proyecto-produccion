const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT COUNT(*) as c FROM Clientes");
        console.log("Total Clientes:", r.recordset[0].c);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
