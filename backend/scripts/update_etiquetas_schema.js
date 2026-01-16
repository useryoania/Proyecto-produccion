const { getPool, sql } = require('../config/db');

async function run() {
    try {
        const pool = await getPool();
        console.log("Checking Etiquetas table schema...");

        // Check if column exists
        const check = await pool.request().query("SELECT COL_LENGTH('Etiquetas', 'CodigoEtiqueta') as ColLen");

        if (check.recordset[0].ColLen === null) {
            console.log("Adding CodigoEtiqueta column...");
            await pool.request().query("ALTER TABLE Etiquetas ADD CodigoEtiqueta NVARCHAR(50)");
            console.log("Column added successfully.");
        } else {
            console.log("Column CodigoEtiqueta already exists.");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error updating schema:", e);
        process.exit(1);
    }
}

run();
