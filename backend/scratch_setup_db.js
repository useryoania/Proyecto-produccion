const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('./config/db');

async function runScript(filename) {
    try {
        const filePath = path.join(__dirname, filename);
        console.log(`\n=== Ejecutando: ${filename} ===`);
        if (!fs.existsSync(filePath)) {
            console.log(`[SKIP] No se encontró ${filename}`);
            return;
        }

        const scriptContent = fs.readFileSync(filePath, 'utf8');
        // Separar por GO y limpiar
        const batches = scriptContent.split(/\bGO\b/i).map(b => b.trim()).filter(b => b.length > 0);

        const pool = await getPool();

        for (let i = 0; i < batches.length; i++) {
            try {
                await pool.request().query(batches[i]);
                console.log(`[OK] Batch ${i + 1}/${batches.length} ejecutado`);
            } catch (err) {
                console.error(`[ERROR] en Batch ${i + 1}/${batches.length}:`, err.message);
            }
        }
    } catch (err) {
        console.error(`Error procesando ${filename}:`, err);
    }
}

async function main() {
    console.log('Iniciando setup de BD...');
    // Archivos en orden lógico
    await runScript('contabilidad_core_setup.sql');
    await runScript('tipos_movimiento_setup.sql');
    await runScript('planes_setup.sql');
    await runScript('ciclos_setup.sql');
    await runScript('check_fk_cuentas.sql');
    
    console.log('Setup de BD finalizado.');
    process.exit(0);
}

main();
