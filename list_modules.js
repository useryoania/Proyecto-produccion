const { getPool } = require('./backend/config/db');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });

async function listModules() {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT IdModulo, Titulo, Ruta, IdPadre FROM Modulos');
        console.log(JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listModules();
