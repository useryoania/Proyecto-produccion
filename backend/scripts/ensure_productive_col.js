const { getPool } = require('../config/db');

async function checkCols() {
    try {
        const pool = await getPool();
        const r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Areas'");
        const cols = r.recordset.map(c => c.COLUMN_NAME);
        console.log("Columnas Areas:", cols);

        if (!cols.includes('EsProductivo')) {
            console.log("⚠️ Columna 'EsProductivo' NO EXISTE. Creandola...");
            await pool.request().query("ALTER TABLE Areas ADD EsProductivo BIT DEFAULT 0");
            console.log("✅ Columna creada. Actualizando datos por defecto (Categoria != 'Administración')...");
            // Lógica heurística: Si Categoria es 'Impresión', 'Procesos', o NULL -> True. Si es 'Administración' -> False.
            await pool.request().query("UPDATE Areas SET EsProductivo = 1 WHERE Categoria IS NULL OR Categoria NOT IN ('Administración', 'Sistema')");
            console.log("✅ Datos actualizados.");
        } else {
            console.log("✅ Columna 'EsProductivo' YA EXISTE.");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkCols();
