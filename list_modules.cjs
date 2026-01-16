const { getPool } = require('./backend/config/db');
const path = require('path');
// backend/config/db loads .env from ../.env (relative to config dir), which is backend/.env
// But since we require it, it runs in its own context.
// Let's just run it.

async function listModules() {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT IdModulo, Titulo, Ruta, IdPadre, IndiceOrden FROM Modulos ORDER BY IndiceOrden');
        console.log(JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listModules();
