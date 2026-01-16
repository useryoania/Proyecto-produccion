const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Asume que script está en backend/scripts y .env en backend/
const { getPool } = require('../config/db');

async function inspectArchivos() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 1 * FROM ArchivosOrden");
        console.log("Columnas y Datos de ArchivosOrden:", result.recordset[0]);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

inspectArchivos();
