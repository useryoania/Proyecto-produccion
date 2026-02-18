const { getPool, sql } = require('../config/db');

(async () => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('Username', sql.VarChar, 'DF')
            .query("SELECT UserID, Username, IdRol FROM Usuarios WHERE Username = @Username OR Nombre LIKE '%DF%'");
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
