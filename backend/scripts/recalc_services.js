const { getPool, sql } = require('../config/db');

async function fixServices() {
    try {
        const pool = await getPool();
        console.log("🔄 Recalculating Next Service for active orders...");

        // Get active orders
        const orders = await pool.request().query(`
            SELECT OrdenID, CodigoOrden 
            FROM Ordenes 
            WHERE Estado NOT IN ('Cancelado', 'Anulado', 'Finalizado')
        `);

        console.log(`Found ${orders.recordset.length} active orders.`);

        for (const o of orders.recordset) {
            await pool.request()
                .input('OrdenID', sql.Int, o.OrdenID)
                .execute('sp_PredecirProximoServicio');
            process.stdout.write('.');
        }

        console.log("\n✅ Done recalculating.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

fixServices();
