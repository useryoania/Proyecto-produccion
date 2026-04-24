const { getPool, sql } = require('./config/db');

getPool().then(async pool => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Obtenemos los huérfanos
        let res = await new sql.Request(transaction).query(`
            SELECT S.Material, S.IDREACT, S.codStock
            FROM [SINCRO-ARTICULOS] S
            LEFT JOIN Articulos A ON S.PROIDPRODUCTO = A.ProIdProducto
            WHERE A.ProIdProducto IS NULL
        `);
        let orphans = res.recordset;
        
        let maxCodRes = await new sql.Request(transaction).query("SELECT MAX(CAST(CodArticulo AS INT)) as MaxCod FROM Articulos WHERE ISNUMERIC(CodArticulo) = 1");
        let startCod = parseInt(maxCodRes.recordset[0].MaxCod) + 1;
        if (isNaN(startCod)) startCod = 9000;

        let insertedCount = 0;
        
        for (let orphan of orphans) {
            let nextCodStr = startCod.toString();
            startCod++;
            
            // Si el IDREACT es 9999, tratemos de darle el startCod también para que sea único
            let idReactToInsert = (orphan.IDREACT && orphan.IDREACT !== 9999) ? orphan.IDREACT : startCod;
            
            // Insertar en Articulos maestro (ProIdProducto is IDENTITY)
            let insertRes = await new sql.Request(transaction)
                .input('Cod', sql.VarChar(50), nextCodStr)
                .input('IdR', sql.Int, idReactToInsert)
                .input('Desc', sql.VarChar(200), orphan.Material)
                .input('Stock', sql.VarChar(50), orphan.codStock || null)
                .query(`
                    INSERT INTO Articulos (CodArticulo, IDProdReact, Descripcion, Mostrar, CodStock)
                    OUTPUT INSERTED.ProIdProducto
                    VALUES (@Cod, @IdR, @Desc, 1, @Stock)
                `);
                
            let newProId = insertRes.recordset[0].ProIdProducto;
            
            // Luego, sincronizamos DE REGRESO la tabla SINCRO-ARTICULOS para enchufarlos
            await new sql.Request(transaction)
                .input('Mat', sql.VarChar(200), orphan.Material)
                .input('NewProId', sql.Int, newProId)
                .input('NewCodArt', sql.VarChar(50), nextCodStr)
                .input('IdR', sql.Int, idReactToInsert)
                .query(`
                    UPDATE [SINCRO-ARTICULOS]
                    SET PROIDPRODUCTO = @NewProId,
                        codArticulo = @NewCodArt,
                        IDREACT = @IdR
                    WHERE Material = @Mat
                `);
            
            insertedCount++;
        }

        await transaction.commit();
        console.log("Completado: Insertados en Articulos y sincronizados devuelta: " + insertedCount);
    } catch(e) {
        await transaction.rollback();
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
});
