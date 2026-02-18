const { getPool, sql } = require('../config/db');

(async () => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('Usuario', sql.VarChar, 'DF')
            .query("SELECT IdUsuario, Usuario, IdRol FROM Usuarios WHERE Usuario = 'DF'");
        console.table(result.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
