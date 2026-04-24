const { getPool } = require('./config/db');

async function test() {
    try {
        const pool = await getPool();
        const res = await pool.request().query(`
            SELECT TOP 1 *
            FROM [SINCRO-ARTICULOS]
        `);
        console.table(res.recordset);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
test();
