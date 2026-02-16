const { getPool, sql } = require('./config/db');

async function addColumns() {
    try {
        const pool = await getPool();
        console.log("🔌 Conectado. Verificando columnas...");

        // 1. Agregar DescripcionWeb (Texto largo para instrucciones)
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ConfigMapeoERP]') AND name = 'DescripcionWeb')
                BEGIN
                    ALTER TABLE ConfigMapeoERP ADD DescripcionWeb NVARCHAR(MAX) NULL;
                    PRINT '✅ Columna DescripcionWeb agregada.';
                END
                ELSE
                BEGIN
                    PRINT 'ℹ️ Columna DescripcionWeb ya existe.';
                END
            `);
        } catch (e) { console.error("Error Columna 1:", e.message); }

        // 2. Agregar ImagenWeb (URL de la imagen)
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ConfigMapeoERP]') AND name = 'ImagenWeb')
                BEGIN
                    ALTER TABLE ConfigMapeoERP ADD ImagenWeb NVARCHAR(MAX) NULL;
                    PRINT '✅ Columna ImagenWeb agregada.';
                END
                ELSE
                BEGIN
                    PRINT 'ℹ️ Columna ImagenWeb ya existe.';
                END
            `);
        } catch (e) { console.error("Error Columna 2:", e.message); }

        console.log("🚀 Migración completada.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error Fatal:", err);
        process.exit(1);
    }
}

addColumns();
