const { getPool, sql } = require('../config/db');

async function debugArticulos() {
    try {
        const pool = await getPool();
        console.log("Conectado a DB. Buscando artículo '48'...");

        // 1. Consulta '48' como INT
        try {
            const resInt = await pool.request().input('cod', sql.Int, 48).query("SELECT CodArticulo, IDProdReact, Descripcion FROM Articulos WHERE CodArticulo = @cod");
            console.log("Consulta (INT 48):", resInt.recordset);
        } catch (e) { console.log("Error consulta INT:", e.message); }

        // 2. Consulta '48' como STRING
        try {
            const resStr = await pool.request().input('cod', sql.VarChar, '48').query("SELECT CodArticulo, IDProdReact, Descripcion FROM Articulos WHERE CodArticulo = @cod");
            console.log("Consulta (STRING '48'):", resStr.recordset);
        } catch (e) { console.log("Error consulta STRING:", e.message); }

        process.exit(0);
    } catch (err) {
        console.error("Error general:", err);
        process.exit(1);
    }
}

debugArticulos();
