const { getPool } = require('./backend/config/db');

async function test() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT * FROM PreciosEspeciales WHERE ClienteID IN (5713091, 5216)");
        console.log(res.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

test();
