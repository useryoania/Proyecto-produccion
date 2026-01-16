require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runSetup() {
    try {
        const pool = await getPool();
        const sqlContent = fs.readFileSync(path.join(__dirname, '../database/setup_TiposFallas.sql'), 'utf-8');

        // Split by GO if simple parsing needed, or assume library handles batch?
        // mssql no soporta GO nativamente en una sola query string regular.
        // Dividiremos por GO.

        const commands = sqlContent.split(/\bGO\b/i).map(c => c.trim()).filter(c => c.length > 0);

        console.log("Recreando tabla TiposFallas...");
        for (const cmd of commands) {
            await pool.request().query(cmd);
        }

        console.log("Tabla TiposFallas recreada con IDENTITY.");
        process.exit(0);
    } catch (err) {
        console.error("Error setup:", err);
        process.exit(1);
    }
}

runSetup();
