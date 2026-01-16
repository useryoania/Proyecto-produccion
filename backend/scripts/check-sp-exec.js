const { getPool } = require('./config/db');
const sql = require('mssql');

async function checkSp() {
    try {
        const pool = await getPool();
        console.log("--- EXEC SP: sp_GetOrdenesControl_V2 ---");
        const result = await pool.request()
            .input('Search', sql.NVarChar, null)
            .input('RolloID', sql.NVarChar, null)
            .execute('sp_GetOrdenesControl_V2');

        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkSp();
