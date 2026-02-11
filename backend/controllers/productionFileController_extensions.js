
/**
 * 7. Buscar Órdenes Entregadas/Finalizadas para Reposición (Atención al Cliente)
 */
const getCompletedOrdersForReplacement = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 3) return res.json([]);

        const pool = await getPool();
        const request = pool.request();

        let sqlQuery = `
            SELECT TOP 20 
                OrdenID, CodigoOrden, Cliente, FechaIngreso, FechaEstimadaEntrega, 
                Estado, Material, DescripcionTrabajo, NoDocERP
            FROM Ordenes WITH (NOLOCK)
            WHERE Estado IN ('ENTREGADO', 'FINALIZADO', 'DESPACHADO', 'PRONTO')
            AND (
                CodigoOrden LIKE @Search 
                OR Cliente LIKE @Search 
                OR CAST(OrdenID AS VARCHAR) = @Exact
                OR NoDocERP LIKE @Search
            )
            ORDER BY OrdenID DESC
        `;

        request.input('Search', sql.NVarChar, `%${q}%`);
        request.input('Exact', sql.NVarChar, q);

        const result = await request.query(sqlQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error("Error getCompletedOrdersForReplacement:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * 8. Crear Orden de Reposición (Batch)
 * Recibe lista de archivos a reponer de una orden ya terminada.
 */
const createCustomerReplacementOrder = async (req, res) => {
    const { originalOrderId, files, globalObservation, userId } = req.body;
    let transaction;

    try {
        if (!originalOrderId || !files || files.length === 0) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Obtener Datos Orden Original
        const ordRes = await new sql.Request(transaction)
            .input('ID', sql.Int, originalOrderId)
            .query("SELECT * FROM Ordenes WHERE OrdenID = @ID");

        if (ordRes.recordset.length === 0) throw new Error("Orden original no encontrada");
        const originalOrder = ordRes.recordset[0];

        // 2. Crear Nueva Orden de Reposición
        // Generar codigo: ORD-123 -R (Si ya existe -R, buscar -R2?)
        // Simplificación: Agregar -R + Random o Timestamp corto para unicidad simple
        const suffix = `-R${Math.floor(Math.random() * 1000)}`;
        const newCode = `${originalOrder.CodigoOrden} ${suffix}`;

        const insertOrderResult = await new sql.Request(transaction)
            .input('NewCode', sql.NVarChar, newCode)
            .input('OldID', sql.Int, originalOrderId)
            .input('GlobalObs', sql.NVarChar, globalObservation || 'Reposición Cliente')
            .query(`
                INSERT INTO dbo.Ordenes(
                    CodigoOrden, Cliente, FechaIngreso, FechaEstimadaEntrega,
                    Material, DescripcionTrabajo, Prioridad,
                    Estado, EstadoenArea, AreaID,
                    Magnitud, IdCabezalERP, ProximoServicio, Observaciones, NoDocERP,
                    FechaEntradaSector, CantidadArchivos, Variante, UnidadMedida, 
                    IDCliente, IDProducto, CodCliente, CodArticulo
                )
                SELECT
                    @NewCode, Cliente, GETDATE(), DATEADD(day, 2, GETDATE()), -- 2 dias default para reposición
                    Material, DescripcionTrabajo, 'URGENTE', -- Prioridad Alta
                    'Pendiente', 'Pendiente', AreaID,
                    Magnitud, IdCabezalERP, ProximoServicio, @GlobalObs, NoDocERP,
                    GETDATE(), 0, Variante, UnidadMedida,
                    IDCliente, IDProducto, CodCliente, CodArticulo
                FROM dbo.Ordenes
                WHERE OrdenID = @OldID;
                
                SELECT SCOPE_IDENTITY() as NewID;
             `);

        const newOrderId = insertOrderResult.recordset[0].NewID;

        let totalFiles = 0;

        // 3. Insertar Archivos Seleccionados
        for (const file of files) {
            // file: { id, meters, obs }
            const oldFileId = file.id;
            const metersToReprint = file.meters;
            const obs = file.obs || 'Reposición Cliente';

            await new sql.Request(transaction)
                .input('NewOrderID', sql.Int, newOrderId)
                .input('OldFileID', sql.Int, oldFileId)
                .input('Metros', sql.Decimal(10, 2), metersToReprint)
                .input('Obs', sql.NVarChar, obs)
                .query(`
                    INSERT INTO dbo.ArchivosOrden(
                        OrdenID, NombreArchivo, RutaAlmacenamiento, Metros, Copias, Ancho, Alto, Material, Observaciones,
                        TipoArchivo, FechaSubida, EstadoArchivo
                    )
                    SELECT 
                        @NewOrderID, NombreArchivo, RutaAlmacenamiento, @Metros, Copias, Ancho, Alto, Material, @Obs,
                        TipoArchivo, GETDATE(), 'Pendiente'
                    FROM dbo.ArchivosOrden WHERE ArchivoID = @OldFileID
                `);

            totalFiles++;

            // Registrar en FallasProduccion para historial (TipoFalla Genérico 'Reposición Cliente' o similar)
            // Asumimos TipoFallaID 99 o NULL si no es critica la estadística exacta aqui, 
            // pero mejor insertar para traza.
            // Si no tenemos ID de tipo falla, enviamos NULL o 1 (General).
            await new sql.Request(transaction)
                .input('OldID', sql.Int, originalOrderId)
                .input('FileID', sql.Int, oldFileId)
                .input('AreaID', sql.VarChar, originalOrder.AreaID || 'General')
                .input('Metros', sql.Decimal(10, 2), metersToReprint)
                .input('Obs', sql.NVarChar, obs)
                .query(`
                    INSERT INTO FallasProduccion(OrdenID, ArchivoID, AreaID, FechaFalla, TipoFalla, CantidadFalla, Observaciones)
                    VALUES(@OldID, @FileID, @AreaID, GETDATE(), 1, @Metros, @Obs) 
                `);
        }

        // Actualizar contador archivos orden nueva
        await new sql.Request(transaction)
            .input('Total', sql.Int, totalFiles)
            .input('ID', sql.Int, newOrderId)
            .query("UPDATE Ordenes SET CantidadArchivos = @Total WHERE OrdenID = @ID");

        await transaction.commit();
        res.json({ success: true, newOrderId, newCode });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error createCustomerReplacementOrder:", error);
        res.status(500).json({ error: error.message });
    }
};
