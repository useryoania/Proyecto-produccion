const { getPool, sql } = require('./backend/config/db');

async function migrate() {
    try {
        const pool = await getPool();
        const transaction = pool.transaction();
        await transaction.begin();

        try {
            console.log("Limpiando duplicados en PreciosEspeciales...");
            await transaction.request().query(`
                DELETE PE 
                FROM PreciosEspeciales PE
                INNER JOIN Clientes C ON PE.ClienteID = C.CodCliente
                WHERE EXISTS (
                    SELECT 1 FROM PreciosEspeciales PE2 
                    WHERE PE2.ClienteID = C.CliIdCliente
                )
            `);

            console.log("Migrando el resto de PreciosEspeciales a CliIdCliente...");
            await transaction.request().query(`
                UPDATE PE 
                SET PE.ClienteID = C.CliIdCliente 
                FROM PreciosEspeciales PE 
                INNER JOIN Clientes C ON PE.ClienteID = C.CodCliente
                WHERE PE.ClienteID <> C.CliIdCliente AND C.CliIdCliente IS NOT NULL
            `);

            console.log("Limpiando duplicados en PreciosEspecialesItems...");
            await transaction.request().query(`
                DELETE PEI 
                FROM PreciosEspecialesItems PEI
                INNER JOIN Clientes C ON PEI.ClienteID = C.CodCliente
                WHERE EXISTS (
                    SELECT 1 FROM PreciosEspecialesItems PEI2 
                    WHERE PEI2.ClienteID = C.CliIdCliente AND PEI2.CodArticulo = PEI.CodArticulo
                )
            `);

            console.log("Migrando el resto de PreciosEspecialesItems a CliIdCliente...");
            await transaction.request().query(`
                UPDATE PEI 
                SET PEI.ClienteID = C.CliIdCliente 
                FROM PreciosEspecialesItems PEI 
                INNER JOIN Clientes C ON PEI.ClienteID = C.CodCliente
                WHERE PEI.ClienteID <> C.CliIdCliente AND C.CliIdCliente IS NOT NULL
            `);

            await transaction.commit();
            console.log("Migracion exitosa a la nueva estructura unica de CliIdCliente!");
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
