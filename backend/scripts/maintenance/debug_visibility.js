const { getPool, sql } = require('./config/db');

async function checkVisibility() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT DISTINCT CodigoERP, NombreReferencia, VisibleWeb FROM ConfigMapeoERP WHERE NombreReferencia IS NOT NULL");
        console.log("RESULTADOS CRUDOS DE LA DB:");
        console.dir(result.recordset, { depth: null });

        console.log("\nPROCESAMIENTO:");
        if (result.recordset) {
            result.recordset.forEach(row => {
                const code = row.CodigoERP ? row.CodigoERP.trim() : 'N/A';
                // La lógica actual en el controller:
                const visible = (row.VisibleWeb === false || row.VisibleWeb === 0) ? false : true;
                console.log(`Code: '${code}', RawVisible: ${row.VisibleWeb} (${typeof row.VisibleWeb}), Computed: ${visible}`);
            });
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        // Force exit because pool keeps connection alive
        process.exit(0);
    }
}

checkVisibility();
