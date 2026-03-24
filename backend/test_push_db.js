const { sql, getPool } = require('./config/db');

async function check() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT * FROM PushSubscriptions");
        console.log("Subscriptions found:", result.recordset.length);
        console.log(result.recordset);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
