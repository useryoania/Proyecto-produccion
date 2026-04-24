const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let maxCodRes = await new sql.Request(transaction).query("SELECT MAX(CAST(CodArticulo AS INT)) as MaxCod FROM Articulos WHERE ISNUMERIC(CodArticulo) = 1");
        let startCod = parseInt(maxCodRes.recordset[0].MaxCod) + 1;
        if (isNaN(startCod)) startCod = 9000;

        let res = await new sql.Request(transaction).query(`
            SELECT ProIdProducto, CodArticulo, Descripcion
            FROM Articulos 
            WHERE LTRIM(RTRIM(CAST(CodArticulo AS VARCHAR))) = '999'
        `);
        
        let recordsToUpdate = res.recordset;
        let updatedCount = 0;
        
        for (let record of recordsToUpdate) {
            console.log("Encontrado:", record.Descripcion, "con CodArticulo:", record.CodArticulo);
            let nextCodStr = startCod.toString();
            startCod++;
            
            // 1. Actualizar Master (Articulos)
            await new sql.Request(transaction)
                .input('NewCod', sql.VarChar(50), nextCodStr)
                .input('ProId', sql.Int, record.ProIdProducto)
                .query(`
                    UPDATE Articulos
                    SET CodArticulo = @NewCod
                    WHERE ProIdProducto = @ProId
                `);
                
            // 2. Sincronizar SINCRO-ARTICULOS si existe para ese ID
            await new sql.Request(transaction)
                .input('NewCod', sql.VarChar(50), nextCodStr)
                .input('ProId', sql.Int, record.ProIdProducto)
                .query(`
                    UPDATE [SINCRO-ARTICULOS]
                    SET codArticulo = @NewCod
                    WHERE PROIDPRODUCTO = @ProId
                `);
                
            updatedCount++;
        }

        await transaction.commit();
        console.log("Completado: " + updatedCount + " codArticulos que eran 999 han sido reemplazados y sincronizados.");
    } catch(e) {
        await transaction.rollback();
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
});
