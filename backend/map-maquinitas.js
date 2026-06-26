const { getPool, sql } = require('./config/db');

async function mapMaquinitas() {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const localIds = [465, 466, 467];
        const maestroId = 157;
        const nombreWms = 'MAQUINA PATILLERA';
        const varianteId = 40;
        const nombreVariante = 'MAQUINA PATILLERA';
        const sku = 'ART-MAQUI-1-VAR-MAQU-BASE-175'; // Optional if not needed, we can just leave empty or query it. Let's just use empty if we don't know it, or find it first.
        
        for (const id of localIds) {
            // Master
            await transaction.request()
                .input('Id', sql.Int, id)
                .input('MaestroId', sql.Int, maestroId)
                .input('NombreWms', sql.VarChar, nombreWms)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM Articulos_Wms WHERE Idproid = @Id)
                    BEGIN
                        INSERT INTO Articulos_Wms (Idproid, producto_maestro_id, nombre_wms, fecha_sync)
                        VALUES (@Id, @MaestroId, @NombreWms, GETDATE())
                    END
                    ELSE
                    BEGIN
                        UPDATE Articulos_Wms 
                        SET producto_maestro_id = @MaestroId, nombre_wms = @NombreWms 
                        WHERE Idproid = @Id
                    END
                `);
            
            // Variant
            await transaction.request()
                .input('Id', sql.Int, id)
                .input('VarianteId', sql.Int, varianteId)
                .input('NombreVariante', sql.VarChar, nombreVariante)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM Articulos_WMS_Variantes WHERE Idproid = @Id AND wms_variante_id = @VarianteId)
                    BEGIN
                        INSERT INTO Articulos_WMS_Variantes (Idproid, wms_variante_id, sku, nombre_variante)
                        VALUES (@Id, @VarianteId, '', @NombreVariante)
                    END
                    ELSE
                    BEGIN
                        UPDATE Articulos_WMS_Variantes 
                        SET nombre_variante = @NombreVariante 
                        WHERE Idproid = @Id AND wms_variante_id = @VarianteId
                    END
                `);
        }

        await transaction.commit();
        console.log('Maquinitas mapeadas exitosamente.');
    } catch (err) {
        await transaction.rollback();
        console.error('Error:', err);
    }
    process.exit(0);
}

mapMaquinitas();
