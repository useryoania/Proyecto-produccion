const { getPool } = require('./config/db');

async function checkData() {
    try {
        const pool = await getPool();
        console.log("--- TEST DATA: Ordenes (Top 5) ---");
        const result = await pool.request().query("SELECT TOP 5 OrdenID, Cliente, DescripcionTrabajo FROM Ordenes ORDER BY FechaIngreso DESC");
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkData();
