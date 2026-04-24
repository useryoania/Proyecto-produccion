const { getPool, sql } = require('./backend/config/db');

async function migrate() {
    try {
        const pool = await getPool();

        // Add Categoria column
        await pool.request().query("ALTER TABLE PerfilesPrecios ADD Categoria VARCHAR(255) NULL");
        console.log("Columna Categoria agregada a PerfilesPrecios");

        // Seed default categories based on common prefixes
        const res = await pool.request().query("SELECT ID, Nombre FROM PerfilesPrecios");
        for(const row of res.recordset) {
            let cat = 'Todos';
            const nameUpper = row.Nombre.toUpperCase();
            if (nameUpper.includes('DTF')) cat = 'DTF';
            else if (nameUpper.includes('TPU')) cat = 'TPU';
            else if (nameUpper.includes('BORDADO') || nameUpper.includes('EMB') || nameUpper.includes('UB')) cat = 'Bordado';
            else if (nameUpper.includes('EST') || nameUpper.includes('ESTAMPADO')) cat = 'Estampados';
            else if (nameUpper.includes('SUBLIMACION') || nameUpper.includes('SB')) cat = 'Sublimación';
            
            await pool.request()
                .input('cat', sql.VarChar, cat)
                .input('id', sql.Int, row.ID)
                .query("UPDATE PerfilesPrecios SET Categoria = @cat WHERE ID = @id");
        }
        
        console.log("Migración inicial y heurísticas aplicadas exitosamente.");
        process.exit(0);

    } catch(e) {
        if (e.message.includes('already has')) {   // SQL Server specific message part if column exists
            console.log("Parece que ya existía: ", e.message);
            process.exit(0);
        }
        console.error(e);
        process.exit(1);
    }
}
migrate();
