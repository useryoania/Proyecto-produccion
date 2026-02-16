const { poolPromise, sql } = require('../config/db');
const sheetService = require('../services/sheetService');

exports.importarDTF = async (req, res) => {
    let pool;
    try {
        pool = await poolPromise;
        const SPREADSHEET_ID = 'TU_ID_DE_PLANILLA_AQUI'; 
        const RANGE = 'base!A2:AB'; // Leemos hasta la columna AB (donde terminan las copias)
        const AREA_ID_DTF = 1; // Ajusta según tu tabla dbo.ConfigMapeoERP

        // 1. Obtener datos de Google Sheets vía el Servicio
        const rawData = await sheetService.leerPlanilla(SPREADSHEET_ID, RANGE);

        if (!rawData || rawData.length === 0) {
            return res.json({ success: true, message: 'No hay datos nuevos en la planilla DTF.' });
        }

        const activeTransaction = new sql.Transaction(pool);
        await activeTransaction.begin();

        try {
            let importCount = 0;
            const insertedIds = [];

            for (const fila of rawData) {
                // MAPEÓ DE COLUMNAS (Basado en tu descripción)
                // Columna A=0, B=1, C=2, etc.
                const erpId = (fila[0] || '').trim(); // Suponiendo que el ID Cabezal está en A
                const cliente = (fila[2] || 'Cliente Desconocido').trim(); // Suponiendo C
                const descripcionTrabajo = (fila[3] || 'Sin descripción').trim(); // Suponiendo D
                const codigoOrden = `DTF-${erpId}`; 

                // --- VALIDACIÓN DE EXISTENCIA ---
                const checkExist = await new sql.Request(activeTransaction)
                    .input('erpId', sql.VarChar(50), erpId)
                    .input('areaId', sql.Int, AREA_ID_DTF)
                    .query(`SELECT OrdenID FROM dbo.Ordenes WHERE IdCabezalERP = @erpId AND AreaID = @areaId`);

                if (checkExist.recordset.length > 0) continue;

                // --- INSERTAR CABECERA DE ORDEN ---
                const insertOrder = await new sql.Request(activeTransaction)
                    .input('AreaID', sql.Int, AREA_ID_DTF)
                    .input('Cliente', sql.NVarChar(200), cliente)
                    .input('Desc', sql.NVarChar(300), descripcionTrabajo)
                    .input('Prioridad', sql.VarChar(20), 'Normal')
                    .input('Fecha', sql.DateTime, new Date())
                    .input('CodigoOrden', sql.VarChar(100), codigoOrden)
                    .input('IdERP', sql.VarChar(50), erpId)
                    .query(`
                        INSERT INTO dbo.Ordenes (
                            AreaID, Cliente, DescripcionTrabajo, Prioridad, Estado, 
                            FechaIngreso, ArchivosCount, CodigoOrden, IdCabezalERP
                        )
                        OUTPUT INSERTED.OrdenID
                        VALUES (
                            @AreaID, @Cliente, @Desc, @Prioridad, 'Pendiente', 
                            @Fecha, 0, @CodigoOrden, @IdERP
                        )
                    `);

                const newOrderId = insertOrder.recordset[0].OrdenID;
                let filesCount = 0;

                // --- INSERTAR DETALLES (ARCHIVOS Y COPIAS) ---
                // Mapeo Dinámico: Archivos (I a S -> Índices 8 a 18) | Copias (R a AB -> Índices 17 a 27)
                // Nota: Hay un solapamiento en R/S según tu descripción, ajustamos:
                for (let i = 8; i <= 18; i++) {
                    const linkArchivo = fila[i];
                    if (!linkArchivo || linkArchivo === '') continue;

                    const copiasIdx = i + 9; // Si archivo es I (8), copia es R (17)
                    const cantCopias = parseInt(fila[copiasIdx]) || 1;

                    await new sql.Request(activeTransaction)
                        .input('OID', sql.Int, newOrderId)
                        .input('Nombre', sql.VarChar(200), `Archivo Area DTF - ${i}`)
                        .input('Ruta', sql.VarChar(500), linkArchivo)
                        .input('Copias', sql.Int, cantCopias)
                        .query(`
                            INSERT INTO dbo.ArchivosOrden (
                                OrdenID, NombreArchivo, RutaAlmacenamiento, Copias, FechaSubida
                            )
                            VALUES (@OID, @Nombre, @Ruta, @Copias, GETDATE())
                        `);
                    filesCount++;
                }

                // Actualizar contador de archivos
                await new sql.Request(activeTransaction)
                    .input('OID', sql.Int, newOrderId)
                    .input('Count', sql.Int, filesCount)
                    .query("UPDATE dbo.Ordenes SET ArchivosCount = @Count WHERE OrdenID = @OID");

                insertedIds.push(newOrderId);
                importCount++;
            }

            // --- FASE 2: PROCEDIMIENTOS ALMACENADOS ---
            for (const orderId of insertedIds) {
                try {
                    await new sql.Request(activeTransaction).input('OrdenID', sql.Int, orderId).execute('sp_CalcularFechaEntrega');
                    await new sql.Request(activeTransaction).input('OrdenID', sql.Int, orderId).execute('sp_PredecirProximoServicio');
                } catch (e) { console.warn("SP Error:", e.message); }
            }

            await activeTransaction.commit();
            res.json({ success: true, message: `DTF Sincronizado: ${importCount} órdenes creadas.` });

        } catch (err) {
            await activeTransaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("❌ Error DTF Controller:", err);
        res.status(500).json({ error: err.message });
    }
};