const { getPool } = require('./config/db');
async function check() {
    try {
        const pool = await getPool();
        const r = await pool.request().query("SELECT COLUMN_NAME, COLUMN_DEFAULT, is_identity FROM INFORMATION_SCHEMA.COLUMNS c JOIN sys.columns s ON c.COLUMN_NAME = s.name AND s.object_id = OBJECT_ID('OrdenesDeposito') WHERE c.TABLE_NAME = 'OrdenesDeposito'");
        console.dir(r.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e); process.exit(1);
    }
}
check();
