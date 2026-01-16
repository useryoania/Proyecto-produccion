const axios = require('axios');
const { sql, getPool } = require('../config/db');

// --- ESTA ES LA FUNCIÓN QUE LLAMA EL SCHEDULER ---
exports.syncOrdersLogic = async (io) => {
    try {
        const pool = await getPool();

        // 1. Obtener Configuración (Última factura procesada)
        const configRes = await pool.request().query(`
            SELECT 
                (SELECT Valor FROM ConfiguracionGlobal WHERE Clave = 'ULTIMAFACTURA') as UltimaFact
        `);

        // Valor por defecto 0 si no existe
        const ultimaFacturaDB = parseInt(configRes.recordset[0]?.UltimaFact) || 0;
        console.log(`🔄 Iniciando Sync. Buscando facturas mayores a: ${ultimaFacturaDB}`);

        // 2. (OPCIONAL/REMOVIDO) Autenticación ERP 
        // La nueva API (puerto 6061) no parece requerir la auth antigua.
        // Si se requiere, descomentar y ajustar.
        const axiosConfig = {};

        // 3. Traer pedidos usando la nueva API
        // Endpoint espera ?NroFact=<ultimo_id>
        const response = await axios.get(`http://localhost:6061/api/pedidos/todos?NroFact=${ultimaFacturaDB}`, axiosConfig);

        let rawPedidos = response.data.data || [];

        /* 
           Nota: La API ya filtra por NroFact, pero mantenemos una validación extra
           por seguridad si la respuesta trae todo.
        */
        rawPedidos = rawPedidos.filter(p => parseInt(p.NroFact) > ultimaFacturaDB);

        if (rawPedidos.length === 0) {
            console.log("✅ No hay facturas nuevas.");
            return { success: true, message: 'Sin facturas nuevas.' };
        }

        const clean = (val) => val ? val.toString().trim() : "";
        const tempGroups = {};
        // Use var or let outside try/catch if scope issue, but here looks fine. 
        // Ensure initialized properly.
        let maxFacturaEncontrada = ultimaFacturaDB;

        // 4. Procesar Detalle de Pedidos
        for (const p of rawPedidos) {
            const nroFact = clean(p.NroFact);
            const nroDoc = clean(p.NroDoc);

            if (parseInt(nroFact) > maxFacturaEncontrada) maxFacturaEncontrada = parseInt(nroFact);

            try {
                // Nueva ruta detalle: /api/pedidos/{id}/con_sublineas
                const detalleRes = await axios.get(`http://localhost:6061/api/pedidos/${nroFact}/con_sublineas`, axiosConfig);
                const d = detalleRes.data.data;

                const id1 = (d.identificadores || []).find(i => Number(i.CodId) === 1);
                const id2 = (d.identificadores || []).find(i => Number(i.CodId) === 2);
                const nombreDelTrabajo = clean(id1?.Descripcion || id1?.Valor || "Sin Nombre");
                const modoEntrega = clean(id2?.Descripcion || id2?.Valor || "Normal");

                for (const l of (d.Lineas || [])) {
                    /*
                      AHORA: El JSON trae CodArt, CodStock, Grupo.
                      OPTIMIZACIÓN: No buscar en Articulos.
                      - Usar l.Grupo -> para buscar AreaID en ConfigMapeoERP
                      - Usar l.CodStock -> para buscar VarianteNombre en StockArt
                    */
                    const grupoAPI = clean(l.Grupo);     // Ej: "1.3"
                    const codStockAPI = clean(l.CodStock); // Ej: "1.1.3.1"
                    const codArtLimpio = clean(l.CodArt);

                    const dbResult = await pool.request()
                        .input('grupo', sql.VarChar, grupoAPI)
                        .input('codStock', sql.VarChar, codStockAPI)
                        .query(`
                            SELECT TOP 1 
                                m.AreaID_Interno as AreaID,
                                LTRIM(RTRIM(s.Articulo)) as VarianteNombre
                            FROM [SecureAppDB].[dbo].[ConfigMapeoERP] m
                            FULL OUTER JOIN [SecureAppDB].[dbo].[StockArt] s 
                            
                            
                                ON LTRIM(RTRIM(s.CodStock)) = LTRIM(RTRIM(@codStock))
                            WHERE LTRIM(RTRIM(CAST(m.CodigoERP AS VARCHAR))) = LTRIM(RTRIM(@grupo))
                        `);

                    const areaData = dbResult.recordset[0];
                    if (!areaData || !areaData.AreaID) {
                        // Si no mapea Area, lo saltamos (loguear si es necesario debug)
                        continue;
                    }

                    const masterKey = `${nroDoc}_${areaData.AreaID}`;

                    if (!tempGroups[masterKey]) {
                        tempGroups[masterKey] = {
                            nroDoc, areaId: areaData.AreaID, cliente: clean(d.Nombre),
                            fecha: d.Fecha, nota: clean(p.Observaciones),
                            nombreTrabajo: nombreDelTrabajo, prioridad: modoEntrega,
                            tinta: "", materiales: {}
                        };
                    }

                    if (!tempGroups[masterKey].materiales[codArtLimpio]) {
                        tempGroups[masterKey].materiales[codArtLimpio] = {
                            variante: areaData.VarianteNombre || "Estándar",
                            descripcionMaterial: clean(l.Descripcion),
                            items: []
                        };


                    }

                    // ACUMULAMOS MAGNITUD PARA LA ORDEN
                    const magnitudTotal = Number(l.CantidadHaber) || 0;
                    if (!tempGroups[masterKey].materiales[codArtLimpio].totalMagnitud) {
                        tempGroups[masterKey].materiales[codArtLimpio].totalMagnitud = 0;
                    }
                    tempGroups[masterKey].materiales[codArtLimpio].totalMagnitud += magnitudTotal;

                    const sublineas = l.Sublineas || [];

                    // CASO: SERVICIO EXTRA SIN ARCHIVOS
                    if (sublineas.length === 0) {
                        tempGroups[masterKey].materiales[codArtLimpio].items.push({
                            descripcion: clean(l.Descripcion),
                            link: "", // Sin archivo
                            copias: 1,
                            metros: magnitudTotal,
                            notas: "Servicio Extra (Sin Archivo)",
                            codArt: codArtLimpio,
                            sublineaId: 0
                        });
                    }

                    sublineas.forEach(sl => {
                        // 2. LÓGICA DE TINTA (CantCopias === 0)
                        if (parseInt(sl.CantCopias) === 0 && sl.Notas && sl.Notas.includes("Tinta:")) {
                            tempGroups[masterKey].tinta = sl.Notas.replace("Tinta:", "").trim();
                        } else {
                            const copiasReales = Number(sl.CantCopias) || 1;
                            const metrosUnitarios = copiasReales > 0 ? (magnitudTotal / copiasReales) : 0;

                            // Determinación de Tipo de Archivo
                            let tipoArchivo = 'Genérico';
                            if (sl.Archivo && sl.Archivo.trim() !== '' && copiasReales !== 0) {
                                tipoArchivo = 'Impresion';
                            }

                            tempGroups[masterKey].materiales[codArtLimpio].items.push({
                                descripcion: clean(l.Descripcion),
                                link: sl.Archivo,
                                copias: copiasReales,
                                metros: metrosUnitarios, // Nuevo Campo
                                notas: sl.Notas, // Asegurarnos de mantener Notas
                                codArt: codArtLimpio,
                                sublineaId: sl.Sublinea_id,
                                tipo: tipoArchivo
                            });
                        }
                    });
                }
            } catch (err) {
                console.error(`❌ Error detalle NroFact ${nroFact}:`, err.message);
            }
        }

        // 5. Inserción en Base de Datos
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const key in tempGroups) {
                const group = tempGroups[key];

                // --- Lógica para Código Visual (1/2), (2/2) ---
                const listaMat = Object.keys(group.materiales);
                const totalMateriales = listaMat.length;

                for (let i = 0; i < totalMateriales; i++) {
                    const codArt = listaMat[i];
                    const matData = group.materiales[codArt];

                    if (matData.items.length === 0 && !group.tinta) continue;

                    // Formato solicitado: 34 (1/2)
                    const codVisual = `${group.nroDoc} (${i + 1}/${totalMateriales})`;

                    const resOrd = await new sql.Request(transaction)
                        .input('AreaID', sql.VarChar, group.areaId)
                        .input('Cliente', sql.NVarChar, group.cliente)
                        .input('CodigoOrden', sql.VarChar, codVisual)
                        .input('NoDocERP', sql.VarChar, group.nroDoc)
                        .input('DescTrabajo', sql.NVarChar, group.nombreTrabajo)
                        .input('Prioridad', sql.VarChar, group.prioridad)
                        .input('Nota', sql.NVarChar, group.nota)
                        .input('Tinta', sql.VarChar, group.tinta)
                        .input('Material', sql.VarChar, matData.descripcionMaterial || "S/M")
                        .input('Variante', sql.VarChar, matData.variante)
                        .input('Fecha', sql.DateTime, new Date(group.fecha))
                        .input('Magnitud', sql.VarChar, (matData.totalMagnitud || 0).toFixed(2)) // INSERT MAGNITUD
                        .query(`
                            INSERT INTO dbo.Ordenes (
                                AreaID, Cliente, DescripcionTrabajo, Prioridad, Estado, EstadoenArea,
                                FechaIngreso, Material, Variante, CodigoOrden, NoDocERP, 
                                Nota, Tinta, ArchivosCount, Magnitud
                            )
                            OUTPUT INSERTED.OrdenID
                            VALUES (
                                @AreaID, @Cliente, @DescTrabajo, @Prioridad, 'Pendiente', 'Pendiente',
                                @Fecha, @Material, @Variante, @CodigoOrden, @NoDocERP, 
                                @Nota, @Tinta, 0, @Magnitud
                            )
                        `);

                    const newId = resOrd.recordset[0].OrdenID;

                    // Ejecutar SPs para cálculos automáticos (Igual que en Importación Manual)
                    try {
                        console.log(`[AutoSync] New Order ${newId}: Calculating Route & Date...`);
                        await new sql.Request(transaction).input('OrdenID', sql.Int, newId).execute('sp_PredecirProximoServicio');
                        await new sql.Request(transaction).input('OrdenID', sql.Int, newId).execute('sp_CalcularFechaEntrega');
                    } catch (e) {
                        console.error(`[AutoSync] ❌ SP Error for Order ${newId}:`, e.message);
                    }

                    const totalFiles = matData.items.length;
                    for (let k = 0; k < totalFiles; k++) {
                        const item = matData.items[k];
                        const cleanStr = (s) => (s || '').toString().replace(/[\/\\:*?"<>|]/g, '-');

                        let nombreArchivo = '';
                        if (!item.link || item.link.trim() === '') {
                            // Caso Servicio Extra / Sin Archivo: Usar descripcion del material
                            nombreArchivo = `${cleanStr(item.descripcion)} (x${item.copias})`;
                        } else {
                            // Caso Normal con Archivo
                            nombreArchivo = `${cleanStr(codVisual)}-${cleanStr(group.cliente)}-${cleanStr(group.nombreTrabajo)}-Archivo ${k + 1} de ${totalFiles} (x${item.copias} COPIAS)`.substring(0, 250);
                        }

                        await new sql.Request(transaction)
                            .input('OID', sql.Int, newId)
                            .input('Nombre', sql.VarChar, nombreArchivo)
                            .input('Ruta', sql.VarChar, item.link)
                            .input('Copias', sql.Int, item.copias)
                            .input('Metros', sql.Decimal(10, 2), item.metros || 0) // INSERTAMOS EL CAMPO METROS
                            .input('SubID', sql.Int, item.sublineaId)
                            .input('CodArt', sql.VarChar, item.codArt)
                            .input('Tipo', sql.VarChar, item.tipo)
                            .query(`
                                INSERT INTO dbo.ArchivosOrden (
                                    OrdenID, NombreArchivo, RutaAlmacenamiento, Copias, 
                                    FechaSubida, CodigoArticulo, EstadoArchivo, IdSubLineaERP, Metros, TipoArchivo
                                )
                                VALUES (@OID, @Nombre, @Ruta, @Copias, GETDATE(), @CodArt, 'Pendiente', @SubID, @Metros, @Tipo)
                            `);
                    }

                    // Actualizar el conteo de archivos final para la orden
                    await new sql.Request(transaction)
                        .input('OID', sql.Int, newId)
                        .input('Count', sql.Int, matData.items.length)
                        .query("UPDATE Ordenes SET ArchivosCount = @Count WHERE OrdenID = @OID");
                }
            }

            // 6. ACTUALIZAR PUNTERO DE ÚLTIMA FACTURA
            await new sql.Request(transaction)
                .input('val', sql.VarChar, maxFacturaEncontrada.toString())
                .query("UPDATE ConfiguracionGlobal SET Valor = @val WHERE Clave = 'ULTIMAFACTURA'");

            await transaction.commit();
            console.log(`✅ Sincronización exitosa. Puntero actualizado a factura: ${maxFacturaEncontrada}`);

            // EMITIR EVENTO SOCKET
            if (io) {
                console.log("📡 Emitiendo evento 'server:ordersUpdated' a clientes...");
                io.emit('server:ordersUpdated', { message: 'Nuevos pedidos sincronizados', lastFact: maxFacturaEncontrada });
            }

            return { success: true };

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error("❌ Error Crítico SyncLogic:", error);
        console.error(error.stack);
        throw error;
    }
};

// --- ESTE ES EL QUE LLAMA LA RUTA HTTP ---
exports.syncOrders = async (req, res) => {
    try {
        const result = await exports.syncOrdersLogic(req.app.get('socketio'));
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};