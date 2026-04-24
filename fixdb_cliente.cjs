const { getPool, sql } = require('./backend/config/db');

async function run() {
    try {
        const pool = await getPool();
        // Clear all data
        await pool.request().query("DELETE FROM PreciosEspecialesItems");
        console.log("Cleared PreciosEspecialesItems");
        await pool.request().query("DELETE FROM PreciosEspeciales");
        console.log("Cleared PreciosEspeciales");

        // Rename columns
        await pool.request().query("EXEC sp_rename 'PreciosEspeciales.ClienteID', 'CliIdCliente', 'COLUMN'");
        console.log("Renamed PreciosEspeciales.ClienteID -> CliIdCliente");
        await pool.request().query("EXEC sp_rename 'PreciosEspecialesItems.ClienteID', 'CliIdCliente', 'COLUMN'");
        console.log("Renamed PreciosEspecialesItems.ClienteID -> CliIdCliente");

    } catch(e) {
        console.log("Error:", e.message);
    }
    process.exit();
}
run();
