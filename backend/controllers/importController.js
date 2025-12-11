const { getPool, sql } = require('../config/db');
const erpService = require('../services/erpService');

exports.syncOrders = async (req, res) => {
    try {
        const pool = await getPool();

        // 1. Obtener datos (Ahora vienen optimizados: 1 fila por ítem)
        const rawData = await erpService.fetchErpOrders();
        
        if (!rawData || rawData.length === 0) {
            return res.json({ success: true, message: 'No hay pedidos nuevos en el ERP.' });
        }

        // 2. Mapeo de Áreas
        const mapResult = await pool.request().query("SELECT CodigoERP, AreaID_Interno, CODORDEN FROM dbo.ConfigMapeoERP");
        const erpMap = {};
        mapResult.recordset.forEach(row => {
            erpMap[row.CodigoERP.trim()] = { areaId: row.AreaID_Interno, prefix: row.CODORDEN };
        });

        // ---------------------------------------------------------
        // FASE 1: AGRUPACIÓN DIRECTA
        // ---------------------------------------------------------
        const tempGroups = {};

        rawData.forEach(item => {
            // Datos básicos
            const cabezalId = (item.CabezalID || '').trim();
            const grupoErp = (item.Grupo || '').trim();
            const mapData = erpMap[grupoErp];
            
            if (!mapData) return; // Ignorar si no hay mapa para el área

            const artCode = (item.CodArt || 'GEN').trim(); 
            
            // Clave Maestra: Pedido + Área
            const masterKey = `${cabezalId}_${mapData.areaId}`;

            // Inicializar Grupo (Orden Principal)
            if (!tempGroups[masterKey]) {
                tempGroups[masterKey] = {
                    cabezalId,
                    areaId: mapData.areaId,
                    prefix: mapData.prefix,
                    cliente: (item.NombreFantasia || item.Nombre || 'Cliente').trim(),
                    fecha: item.FECHA,
                    materiales: {} // Sub-grupos por material
                };
            }

            // Inicializar Material (Sub-grupo)
            if (!tempGroups[masterKey].materiales[artCode]) {
                tempGroups[masterKey].materiales[artCode] = {
                    codStock: (item.CodStock || '').trim(), // Para columna Variante
                    descMaterial: new Set(),
                    items: []
                };
            }

            // --- PROCESAMIENTO DE LA LÍNEA (AHORA ES DIRECTO) ---
            
            let descripcionItem = (item.Descripcion || '').trim();
            if (!descripcionItem) descripcionItem = `Art. ${artCode}`;

            // Capturamos los campos nuevos directamente del JSON
            const nombreTrabajo = (item.NombreTrabajo || '').trim();
            const prioridad = (item.Prioridad || 'Normal').trim();

            tempGroups[masterKey].materiales[artCode].items.push({
                lineaId: item.LineaID,
                sublineaId: item.sublinea_id,
                codArt: artCode,
                descripcionMaterial: descripcionItem,
                link: (item.archivo || '').trim(),
                copias: item.cantCopias || 1,
                jobName: nombreTrabajo, // Dato directo
                priority: prioridad     // Dato directo
            });

            tempGroups[masterKey].materiales[artCode].descMaterial.add(descripcionItem);
        });

        // ---------------------------------------------------------
        // FASE 2: SECUENCIACIÓN (Generar 1/3, 2/3...)
        // ---------------------------------------------------------
        const finalOrdersToInsert = [];

        for (const masterKey in tempGroups) {
            const group = tempGroups[masterKey];
            const listaMateriales = Object.keys(group.materiales);
            const totalMateriales = listaMateriales.length;

            listaMateriales.forEach((artCode, index) => {
                const matData = group.materiales[artCode];
                const indice = index + 1;

                // 1. Determinar Nombre del Trabajo (Concatenando si hay varios en el mismo material)
                const uniqueJobs = [...new Set(matData.items.map(i => i.jobName).filter(Boolean))];
                let jobDescription = uniqueJobs.join(' + ');
                
                // Si no hay nombre de trabajo, usamos fallback
                if (!jobDescription) jobDescription = `ERP #${group.cabezalId} (${indice}/${totalMateriales})`;

                // 2. Prioridad Global (Si uno es urgente, todo el lote es urgente)
                const hasUrgent = matData.items.some(i => i.priority.toLowerCase().includes('urgente') || i.priority.toLowerCase().includes('alta'));
                const finalPriority = hasUrgent ? 'Urgente' : 'Normal';

                // 3. Descripción Material
                const materialStr = Array.from(matData.descMaterial).join(', ').substring(0, 255);

                // 4. Código Visual Único
                const codigoVisual = `${group.prefix}-${group.cabezalId} (${indice}/${totalMateriales})`;

                finalOrdersToInsert.push({
                    codigoOrden: codigoVisual,
                    erpId: group.cabezalId,
                    areaId: group.areaId,
                    cliente: group.cliente,
                    fecha: group.fecha,
                    
                    // CAMPOS PARA BD
                    materialStr: materialStr,       // Columna 'Material'
                    varianteStr: matData.codStock,  // Columna 'Variante' (CodStock)
                    descTrabajo: jobDescription,    // Columna 'DescripcionTrabajo'
                    prioridad: finalPriority,       // Columna 'Prioridad'
                    
                    items: matData.items,
                    metaData: JSON.stringify({
                        erp_source: "auto_sync_v5_optimized",
                        original_art_code: artCode,
                        batch_index: indice,
                        batch_total: totalMateriales
                    })
                });
            });
        }

        // ---------------------------------------------------------
        // FASE 3: INSERCIÓN SQL (Sin cambios)
        // ---------------------------------------------------------
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        let importCount = 0;

        try {
            for (const order of finalOrdersToInsert) {
                
                // Evitar Duplicados
                const checkExist = await new sql.Request(transaction)
                    .input('CodigoOrden', sql.VarChar(100), order.codigoOrden)
                    .query("SELECT Count(*) as count FROM dbo.Ordenes WHERE CodigoOrden = @CodigoOrden");

                if (checkExist.recordset[0].count > 0) continue; 

                // INSERTAR ORDEN
                const insertOrder = await new sql.Request(transaction)
                    .input('AreaID', sql.VarChar(20), order.areaId)
                    .input('Cliente', sql.NVarChar(200), order.cliente)
                    .input('CodigoOrden', sql.VarChar(100), order.codigoOrden)
                    .input('IdCabezalERP', sql.VarChar(50), order.erpId)
                    .input('Desc', sql.NVarChar(300), order.descTrabajo)
                    .input('Material', sql.VarChar(255), order.materialStr)
                    .input('Variante', sql.VarChar(100), order.varianteStr) // CodStock
                    .input('Prioridad', sql.VarChar(20), order.prioridad)
                    .input('Meta', sql.NVarChar(sql.MAX), order.metaData)
                    .input('Fecha', sql.DateTime, new Date(order.fecha))
                    .query(`
                        INSERT INTO dbo.Ordenes (
                            AreaID, Cliente, DescripcionTrabajo, Prioridad, Estado, 
                            FechaIngreso, meta_data, ArchivosCount, Material, Variante,
                            CodigoOrden, IdCabezalERP
                        )
                        OUTPUT INSERTED.OrdenID
                        VALUES (
                            @AreaID, @Cliente, @Desc, @Prioridad, 'Pendiente', 
                            @Fecha, @Meta, 0, @Material, @Variante,
                            @CodigoOrden, @IdCabezalERP
                        )
                    `);

                const newOrderId = insertOrder.recordset[0].OrdenID;

                // INSERTAR DETALLES
                let filesCount = 0;
                for (const item of order.items) {
                    let fileName = `${item.codArt} - ${item.descripcionMaterial}`;
                    if(item.jobName) fileName += ` (${item.jobName})`;
                    fileName = fileName.substring(0, 200);
                    
                    await new sql.Request(transaction)
                        .input('OID', sql.Int, newOrderId)
                        .input('Nombre', sql.VarChar(200), fileName)
                        .input('Ruta', sql.VarChar(500), item.link)
                        .input('Copias', sql.Int, item.copias)
                        .input('LineaID', sql.Int, item.lineaId || 0)
                        .input('SubLineaID', sql.Int, item.sublineaId || 0)
                        .input('CodArt', sql.VarChar(50), item.codArt)
                        .input('Detalle', sql.NVarChar(300), item.descripcionMaterial)
                        .query(`
                            INSERT INTO dbo.ArchivosOrden (
                                OrdenID, NombreArchivo, RutaAlmacenamiento, Copias, Metros, FechaSubida,
                                IdLineaERP, IdSubLineaERP, CodigoArticulo, DetalleLinea
                            )
                            VALUES (
                                @OID, @Nombre, @Ruta, @Copias, 0, GETDATE(),
                                @LineaID, @SubLineaID, @CodArt, @Detalle
                            )
                        `);
                    filesCount++;
                }

                await new sql.Request(transaction)
                    .input('OID', sql.Int, newOrderId)
                    .input('Count', sql.Int, filesCount)
                    .query("UPDATE dbo.Ordenes SET ArchivosCount = @Count WHERE OrdenID = @OID");

                importCount++;
            }

            await transaction.commit();
            res.json({ success: true, message: `Importación optimizada completada. ${importCount} órdenes creadas.` });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error("❌ Error ImportController:", err);
        res.status(500).json({ error: err.message });
    }
};