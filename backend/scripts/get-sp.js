const { getPool } = require('./config/db');

async function getSpDefinition() {
    try {
        const pool = await getPool();
        console.log("--- DEFINICION DE sp_GetOrdenesControl_V2 ---");

        const result = await pool.request().query("sp_helptext 'sp_GetOrdenesControl_V2'");

        result.recordset.forEach(row => {
            process.stdout.write(row.Text);
        });

        console.log("\n-------------------------------------------");
        process.exit(0);
    } catch (err) {
        console.error("Error obteniendo SP:", err.message);
        process.exit(1);
    }
}

getSpDefinition();
