const { getPool } = require('./config/db');
getPool().then(async pool => {
    try {
        const q = await pool.request().query("SELECT name AS ConstraintName FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('SesionesTurno')");
        console.log('Current Constraints:', q.recordset);
    } catch(e) { console.log(e.message); }
    process.exit(0);
});
