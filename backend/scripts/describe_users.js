const { getPool } = require('../config/db');

(async () => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 1 * FROM Usuarios");
        console.log(Object.keys(result.recordset[0]));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
