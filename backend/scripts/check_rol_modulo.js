const { getPool } = require('../config/db');

(async () => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 5 * FROM RolModulo");
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
