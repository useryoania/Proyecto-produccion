require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

async function check() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT * FROM TiposFallas");
        console.log("Registros en TiposFallas:", res.recordset.length);
        console.log(res.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
