const { getPool, sql } = require('./backend/config/db');

async function migrate() {
    try {
        const pool = await getPool();
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            // Migrar PreciosEspeciales
            console.log("Migrando PreciosEspeciales...");
            await transaction.request().query(`
                UPDATE PE 
                SET PE.ClienteID = C.CliIdCliente 
                FROM PreciosEspeciales PE 
                INNER JOIN Clientes C ON PE.ClienteID = C.CodCliente
                WHERE PE.ClienteID <> C.CliIdCliente AND C.CliIdCliente IS NOT NULL
            `);

            // Migrar PreciosEspecialesItems
            console.log("Migrando PreciosEspecialesItems...");
            await transaction.request().query(`
                UPDATE PEI 
                SET PEI.ClienteID = C.CliIdCliente 
                FROM PreciosEspecialesItems PEI 
                INNER JOIN Clientes C ON PEI.ClienteID = C.CodCliente
                WHERE PEI.ClienteID <> C.CliIdCliente AND C.CliIdCliente IS NOT NULL
            `);

            await transaction.commit();
            console.log("Migracion exitosa!");
        } catch (err) {
            await transaction.rollback();
            console.error("Transaccion abortada. Error:", err);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

migrate();
