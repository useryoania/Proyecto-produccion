const { getPool, sql } = require('./config/db');

async function fixShortsMapping() {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Find all variants mapped to 41
        const result = await transaction.request().query(`
            SELECT * FROM Articulos_WMS_Variantes WHERE Idproid = 41
        `);

        let adultCount = 0;
        let childCount = 0;

        for (const row of result.recordset) {
            const nombre = row.nombre_variante.toLowerCase();
            let newId = 460; // Default to Adulto
            
            // Si contiene talles de niños (2, 4, 6, 8, 10, 12, 14, 16) asumiendo que el nombre es "Short 6 ROJO"
            if (/\b(2|4|6|8|10|12|14|16)\b/.test(nombre)) {
                newId = 461; // Niño
                childCount++;
            } else {
                adultCount++;
            }

            // Update the variant
            await transaction.request()
                .input('WmsVarianteId', sql.Int, row.wms_variante_id)
                .input('NewId', sql.Int, newId)
                .query(`
                    UPDATE Articulos_WMS_Variantes 
                    SET Idproid = @NewId 
                    WHERE wms_variante_id = @WmsVarianteId
                `);
        }

        // Also ensure Articulos_Wms exists for 460 and 461
        const wmsMasterId = 163; // from DB (assuming all shorts have the same maestro_id, let's just get it)
        const maestroReq = await transaction.request().query(`SELECT TOP 1 producto_maestro_id, nombre_wms FROM Articulos_Wms WHERE Idproid = 41`);
        if (maestroReq.recordset.length > 0) {
            const maestro = maestroReq.recordset[0];
            
            for (const id of [460, 461]) {
                await transaction.request()
                    .input('Id', sql.Int, id)
                    .input('MaestroId', sql.Int, maestro.producto_maestro_id)
                    .input('NombreWms', sql.VarChar, maestro.nombre_wms)
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM Articulos_Wms WHERE Idproid = @Id)
                        BEGIN
                            INSERT INTO Articulos_Wms (Idproid, producto_maestro_id, nombre_wms, fecha_sync)
                            VALUES (@Id, @MaestroId, @NombreWms, GETDATE())
                        END
                    `);
            }
        }

        // Finally, delete the old mapping for 41
        await transaction.request().query(`DELETE FROM Articulos_Wms WHERE Idproid = 41`);

        await transaction.commit();
        console.log(`Mapped ${adultCount} adult variants and ${childCount} child variants.`);
    } catch (err) {
        await transaction.rollback();
        console.error('Error:', err);
    }
    process.exit(0);
}

fixShortsMapping();
