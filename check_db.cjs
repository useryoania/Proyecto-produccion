const { getPool, sql } = require('./backend/config/db');

async function check() {
    try {
        const pool = await getPool();
        const r1 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PreciosEspeciales'");
        console.table(r1.recordset);
        const r2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clientes'");
        console.table(r2.recordset);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
