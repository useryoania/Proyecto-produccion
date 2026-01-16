const sql = require('mssql');
require('dotenv').config({ path: 'c:\\Integracion\\User-Macrosoft\\backend\\.env' });
const { getPool } = require('c:\\Integracion\\User-Macrosoft\\backend\\config\\db');

async function checkSchema() {
    try {
        const pool = await getPool();
        console.log('--- ROLLOS ---');
        const rollos = await pool.request().query("SELECT TOP 1 * FROM Rollos");
        console.log(Object.keys(rollos.recordset[0] || {}));

        console.log('--- ORDENES ---');
        const ordenes = await pool.request().query("SELECT TOP 1 * FROM Ordenes");
        console.log(Object.keys(ordenes.recordset[0] || {}));

        // Guessing files table
        try {
            console.log('--- ARCHIVOS (guess) ---');
            const archivos = await pool.request().query("SELECT TOP 1 * FROM OrdenesArchivos");
            console.log(Object.keys(archivos.recordset[0] || {}));
        } catch (e) {
            console.log('OrdenesArchivos not found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        // process.exit();
    }
}

checkSchema();
