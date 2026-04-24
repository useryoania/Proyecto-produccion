const { getPool, sql } = require('./backend/config/db');

async function migrate() {
    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Migrar PreciosEspeciales
            // Solo actualiza los registros que hagan match
            const res1 = await transaction.request().query(`
                UPDATE PE
                SET PE.ClienteID = CAST(C.CliIdCliente AS VARCHAR)
                FROM PreciosEspeciales PE
                INNER JOIN Clientes C ON PE.ClienteID = C.CodCliente
                WHERE TRY_CAST(PE.ClienteID AS INT) IS NOT NULL -- Previene actualizar si ya lo cambiaron
            `);
            console.log("Filas actualizadas en PreciosEspeciales: ", res1.rowsAffected);

            // Migrar PreciosEspecialesItems (aunque haya 0, es buena práctica)
            const res2 = await transaction.request().query(`
                UPDATE PEI
                SET PEI.ClienteID = CAST(C.CliIdCliente AS VARCHAR)
                FROM PreciosEspecialesItems PEI
                INNER JOIN Clientes C ON PEI.ClienteID = C.CodCliente
                WHERE TRY_CAST(PEI.ClienteID AS INT) IS NOT NULL
            `);
            console.log("Filas actualizadas en PreciosEspecialesItems: ", res2.rowsAffected);

            // Verificando cómo quedó
            const resCheck = await transaction.request().query(`
                SELECT TOP 5 ClienteID FROM PreciosEspeciales
            `);
            console.log("Muestra de ClienteID en BD ahora:");
            console.table(resCheck.recordset);

            await transaction.commit();
            console.log("Transacción exitosa.");
            process.exit(0);
        } catch (e) {
            await transaction.rollback();
            console.error("Transacción fallida, rollback ejecutado:", e);
            process.exit(1);
        }
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
