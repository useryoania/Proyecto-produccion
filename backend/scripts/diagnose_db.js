const { getPool, sql } = require('../config/db');

async function diagnose() {
    try {
        const pool = await getPool();
        console.log("--- DIAGNOSTICO COLUMNAS ---");

        const r1 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Insumos'");
        const cols = r1.recordset.map(c => c.COLUMN_NAME);
        console.log("Columnas Insumos:", cols);

        if (!cols.includes('CodigoReferencia')) console.error("❌ FALTA Columna CodigoReferencia");
        if (!cols.includes('UnidadDefault')) console.error("❌ FALTA Columna UnidadDefault");
        if (!cols.includes('StockMinimo')) console.error("❌ FALTA Columna StockMinimo");

        process.exit(0);

    } catch (err) {
        console.error("Global Error:", err);
        process.exit(1);
    }
}

diagnose();
