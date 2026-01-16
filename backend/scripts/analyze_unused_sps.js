const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const fs = require('fs');

async function analyze() {
    console.log("🔍 Analizando Stored Procedures no utilizados...");
    console.log("⚠️  NOTA: Este análisis se basa en la caché del servidor SQL. Si el servidor se reinició recientemente, los datos pueden no ser completos.");

    try {
        const pool = await getPool();
        const sqlQuery = fs.readFileSync(path.join(__dirname, 'FindUnusedSPs.sql'), 'utf8');

        const result = await pool.request().query(sqlQuery);

        const unused = result.recordset.filter(r => !r.LAST_EXECUTED);
        const used = result.recordset.filter(r => r.LAST_EXECUTED);

        console.log(`\n📊 RESUMEN:`);
        console.log(`- Total SPs encontrados: ${result.recordset.length}`);
        console.log(`- SPs usados recientemente: ${used.length}`);
        console.log(`- SPs SIN ejecución registrada (Candidatos a eliminar): ${unused.length}`);

        if (unused.length > 0) {
            console.log(`\n📋 LISTA DE CANDIDATOS A ELIMINAR (Top 20 más antiguos):`);
            console.table(unused.sort((a, b) => a.LAST_MODIFIED - b.LAST_MODIFIED).slice(0, 20).map(s => ({
                Nombre: s.PROCEDURE_NAME,
                Modificado: s.LAST_MODIFIED.toISOString().split('T')[0],
                'Veces Ejecutado': 0
            })));

            console.log(`\n💾 Para ver la lista completa, revisa la base de datos o exporta este resultado.`);
        } else {
            console.log("\n✅ ¡Increíble! Todos los Stored Procedures han sido utilizados recientemente.");
        }

        process.exit(0);

    } catch (error) {
        console.error("❌ Error al analizar:", error.message);
        process.exit(1);
    }
}

analyze();
