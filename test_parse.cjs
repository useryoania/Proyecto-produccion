const { getPool } = require('./backend/config/db.js');
getPool().then(async pool => {
    try {
        const r = await pool.request().query(`
            SELECT TOP 5
                OrdCodigoOrden,
                LEFT(OrdCodigoOrden, CASE WHEN CHARINDEX(' ', OrdCodigoOrden) > 0 THEN CHARINDEX(' ', OrdCodigoOrden) - 1 ELSE LEN(OrdCodigoOrden) END) AS CleanOrden
            FROM OrdenesDeposito
            WHERE OrdCodigoOrden LIKE '%(%'
        `);
        console.table(r.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err.message);
        process.exit(1);
    }
});
