require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const sql = require('mssql');

async function check() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT TOP 1 ArchivoID, OrdenID FROM ArchivosOrden");
        console.log("ArchivoID:", res.recordset[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
