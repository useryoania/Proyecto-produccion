const { sql, getPool } = require('./config/db');

async function debugDirectaVariants() {
    try {
        const pool = await getPool();
        console.log("Conectado a la BD para debug DIRECTA...");

        const query = `
            SELECT 'StockArt' as Source, CodStock, Articulo, Grupo FROM StockArt 
            WHERE Grupo LIKE '1.11%' OR Grupo LIKE '1.12%'
               OR CodStock IN ('1.1.11.1', '1.1.12.1');

            SELECT 'ConfigMapeo' as Source, CodigoERP, AreaID_Interno, NombreReferencia FROM ConfigMapeoERP
            WHERE CodigoERP IN ('1.11', '1.12');
        `;

        const result = await pool.request().query(query);
        console.log("Variantes StockArt:");
        console.table(result.recordsets[0]);
        console.log("\nConfigMapeoERP:");
        console.table(result.recordsets[1]);

    } catch (err) {
        console.error("Error en debug:", err);
    } finally {
        process.exit();
    }
}

debugDirectaVariants();
