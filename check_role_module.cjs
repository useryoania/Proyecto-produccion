const { getPool, sql } = require('./backend/config/db');

async function run() {
    try {
        const pool = await getPool();
        const check = await pool.request().query("SELECT * FROM Modulos WHERE Ruta = '/admin/roles'");
        console.log("Existing module:", check.recordset[0]);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
