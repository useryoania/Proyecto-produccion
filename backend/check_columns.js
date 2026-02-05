const { getPool } = require('./config/db');

async function checkColumns() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 1 * FROM Ordenes");
        console.log("Columnas en Ordenes:", Object.keys(result.recordset[0]));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumns();
