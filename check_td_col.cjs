const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TransaccionDetalle' AND COLUMN_NAME = 'TdeReferenciaId'");
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
