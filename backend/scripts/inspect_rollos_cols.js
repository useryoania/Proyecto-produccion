const { getPool } = require('../config/db');
async function run() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rollos'");
        console.table(res.recordset);
        process.exit(0);
    } catch(e) { console.error(e); }
}
run();
