require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

async function checkOrden() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT * FROM Ordenes WHERE OrdenID = 1");
        console.log("Ordenes encontradas:", res.recordset.length);
        if (res.recordset.length > 0) console.log(res.recordset[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkOrden();
