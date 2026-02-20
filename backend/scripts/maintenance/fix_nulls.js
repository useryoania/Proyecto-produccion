const { getPool, sql } = require('./config/db');

async function fixNulls() {
    try {
        const pool = await getPool();
        // Update all active orders with NULL Status in Area to 'Pendiente'
        const res = await pool.request().query("UPDATE Ordenes SET EstadoenArea = 'Pendiente' WHERE EstadoenArea IS NULL");
        console.log(`Fixed ${res.rowsAffected} orders with NULL Area Status.`);
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

fixNulls();
