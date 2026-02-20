const { getPool } = require('./config/db');

async function listColumns() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 1 * FROM ConfigMapeoERP");
        console.log("COLUMNAS DISPONIBLES:");
        console.log(Object.keys(result.recordset[0]));
        console.log("PRIMERA FILA:");
        console.log(result.recordset[0]);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
listColumns();
