const { sql, getPool } = require('./config/db');

async function run() {
    try {
        const pool = await getPool();

        // 1. Get an Order ID
        const orderRes = await pool.request().query("SELECT TOP 1 OrdenID FROM Ordenes WHERE Estado = 'EN PROCESO' OR Estado = 'PENDIENTE'");
        if (orderRes.recordset.length === 0) {
            console.log("No orders found.");
            return;
        }
        const ordenId = orderRes.recordset[0].OrdenID;
        console.log("Testing with OrdenID:", ordenId);

        // 2. Exec SP
        const result = await pool.request()
            .input('OrdenID', sql.Int, ordenId)
            .execute('sp_GetDetalleOrdenControl');

        if (result.recordset.length > 0) {
            console.log("First record keys:", Object.keys(result.recordset[0]));
            console.log("First record sample:", result.recordset[0]);
        } else {
            console.log("No files found for this order.");

            // Query table directly to see columns
            const tableRes = await pool.request().query("SELECT TOP 1 * FROM ArchivosOrden");
            console.log("Direct table query keys:", Object.keys(tableRes.recordset[0]));
        }

    } catch (err) {
        console.error(err);
    } finally {
        // process.exit();
    }
}

run();
