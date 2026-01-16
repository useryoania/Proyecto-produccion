const axios = require('axios');
const { sql, getPool } = require('../config/db');

// Función helper para limpiar strings
const clean = (val) => val ? val.toString().trim() : "";

// Lógica Core de Procesamiento (Reutilizable)
const procesarPedidosCore = async (rawPedidos, pool, res) => {
    console.log(`[DEBUG] procesarPedidosCore INICIO. Items: ${rawPedidos.length}`);

    // 2. Consultar ConfigMapeoERP para obtener prioridades de ordenamiento
    const mappingRes = await pool.request().query(`
        SELECT CodigoERP, AreaID_Interno, Numero FROM ConfigMapeoERP
    `);
    const mappingMap = {};
    mappingRes.recordset.forEach(row => {
        if (row.AreaID_Interno) {
            mappingMap[row.AreaID_Interno.trim()] = row.Numero || 999;
        }
    });

    // 1. Obtener última factura
    const configRes = await pool.request().query(`
        SELECT (SELECT Valor FROM ConfiguracionGlobal WHERE Clave = 'ULTIMAFACTURA') as UltimaFact
    `);
    let ultimaFacturaDB = parseInt(configRes.recordset[0]?.UltimaFact) || 0;

    let maxFacturaEncontrada = ultimaFacturaDB;
    const pedidosParaProcesar = {};

    // 4. Procesar crudos
    for (const p of rawPedidos) {
        let detalleData = p;
        let nroFact = clean(p.NroFact);

        if (!p.Lineas && p.NroFact) {
            continue;
        }

        const nroDoc = clean(detalleData.NroDoc);
        console.log(`[DEBUG] Procesando Doc ID: '${nroDoc}' (Raw: '${detalleData.NroDoc}')`);

        if (!nroDoc) continue;

        if (parseInt(nroFact) > maxFacturaEncontrada) maxFacturaEncontrada = parseInt(nroFact);

        if (!pedidosParaProcesar[nroDoc]) {
            console.log(`[DEBUG] Nuevo Grupo Creado: ${nroDoc}`);
            const id1 = (detalleData.identificadores || []).find(i => Number(i.CodId) === 1);
            const id2 = (detalleData.identificadores || []).find(i => Number(i.CodId) === 2);

            pedidosParaProcesar[nroDoc] = {
                nroFact: nroFact,
                nroDoc: nroDoc,
                cliente: clean(detalleData.Nombre),
                fecha: detalleData.Fecha,
                notaGeneral: clean(detalleData.Observaciones),
                nombreTrabajo: clean(id1?.Descripcion || id1?.Valor || "Sin Nombre"),
                modoEntrega: clean(id2?.Descripcion || id2?.Valor || "Normal"),
                areas: {}
            };
        } else {
            console.log(`[DEBUG] Grupo Existente: ${nroDoc}`);
        }

        const lineas = detalleData.Lineas || [];
        console.log(`[DEBUG] Procesando ${lineas.length} Lineas para ${nroDoc}`);

        for (const l of lineas) {
            const grupoAPI = clean(l.Grupo);
            const codStockAPI = clean(l.CodStock);
            const codArtLimpio = clean(l.CodArt);
            const descArticulo = clean(l.Descripcion);

            // Buscar Mapeo en DB
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
                console.warn(`[DEBUG] Ignorado Item ${descArticulo} (Grupo ${grupoAPI}) - Sin Mapeo`);
                continue;
            }

            const areaID = areaData.AreaID;
            console.log(`[DEBUG] Mapeado '${descArticulo}' -> Area: ${areaID}`);

            if (!pedidosParaProcesar[nroDoc].areas[areaID]) {
                pedidosParaProcesar[nroDoc].areas[areaID] = {
                    areaId: areaID,
                    prioridadOrden: mappingMap[areaID] || 999,
                    tinta: "",
                    materiales: [],
                    archivosRef: []
                };
            }

            const sublineas = l.Sublineas || [];
            let tintaDetectada = "";
            sublineas.forEach(sl => {
                if (sl.Notas && sl.Notas.includes("Tinta:")) {
                    tintaDetectada = sl.Notas.replace("Tinta:", "").trim();
                }
            });
            if (tintaDetectada) pedidosParaProcesar[nroDoc].areas[areaID].tinta = tintaDetectada;

            const itemsProductivos = [];
            const itemsInformativos = [];

            if (sublineas.length === 0) {
                itemsProductivos.push({
                    descripcion: descArticulo,
                    link: "",
                    copias: 1,
                    metros: Number(l.CantidadHaber) || 0,
                    notas: "Servicio Extra (Sin Archivo)",
                    tipo: 'Genérico',
                    sublineaId: 0
                });
            } else {
                sublineas.forEach(sl => {
                    const cant = Number(sl.CantCopias) || 0;
                    const link = sl.Archivo || "";
                    const notas = (sl.Notas || "").toLowerCase();

                    // Lógica de Clasificación
                    const esReferencia = notas.includes("boceto") ||
                        notas.includes("logo") ||
                        notas.includes("guía") ||
                        notas.includes("guia") ||
                        notas.includes("corte");

                    if (esReferencia) {
                        if (link) {
                            let tipoRef = 'REFERENCIA';
                            if (notas.includes("boceto")) tipoRef = 'BOCETO';
                            else if (notas.includes("logo")) tipoRef = 'LOGO';
                            else if (notas.includes("corte")) tipoRef = 'CORTE';

                            itemsInformativos.push({
                                nombreOriginal: (sl.Notas || "Referencia"),
                                link: link,
                                notas: sl.Notas,
                                tipo: tipoRef
                            });
                        }
                    } else {
                        // Productivo
                        if (cant > 0 || (link && !esReferencia)) {
                            const totalMag = Number(l.CantidadHaber) || 0;
                            const metrosUnit = cant > 0 ? (totalMag / cant) : 0;

                            itemsProductivos.push({
                                descripcion: descArticulo,
                                link: link,
                                copias: cant > 0 ? cant : 1,
                                metros: metrosUnit,
                                notas: sl.Notas,
                                tipo: link ? 'Impresion' : 'Genérico',
                                sublineaId: sl.Sublinea_id,
                                codArt: codArtLimpio
                            });
                        }
                    }
                });
            }

            if (itemsProductivos.length > 0) {
                pedidosParaProcesar[nroDoc].areas[areaID].materiales.push({
                    nombre: descArticulo,
                    variante: areaData.VarianteNombre || "Estándar",
                    items: itemsProductivos
                });
            }

            if (itemsInformativos.length > 0) {
                pedidosParaProcesar[nroDoc].areas[areaID].archivosRef.push(...itemsInformativos);
            }
        }
    }

    // 5. Inserción Transaccional Ordenada
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        let codigosGenerados = [];
        console.log(`[DEBUG] Grupos a insertar: ${Object.keys(pedidosParaProcesar).length}`);

        for (const nroDoc in pedidosParaProcesar) {
            const pedido = pedidosParaProcesar[nroDoc];
            const areasArray = Object.values(pedido.areas).sort((a, b) => a.prioridadOrden - b.prioridadOrden);
            const totalOrdenes = areasArray.length;

            console.log(`[DEBUG] Grupo ${nroDoc} tiene ${totalOrdenes} Areas.`);

            for (let i = 0; i < totalOrdenes; i++) {
                const areaObj = areasArray[i];

                const tieneContenido = areaObj.materiales.length > 0 || areaObj.archivosRef.length > 0;
                if (!tieneContenido) {
                    console.log(`[DEBUG] Saltando Area ${areaObj.areaId} por estar vacia.`);
                    continue;
                }

                // FIX: El totalOrdenes puede ser engañoso si algunas áreas se saltan por estar vacías.
                // En teoría "Corte" tiene contenido (file Ref) y Sublimacion tiene contenido (file Prod).
                // Así que no deberíamos saltar ninguna de las 3 del ejemplo.

                const codVisual = `${pedido.nroDoc} (${i + 1}/${totalOrdenes})`.trim();
                codigosGenerados.push(codVisual);

                const fechaBase = new Date(pedido.fecha);
                const isUrgente = (pedido.modoEntrega || '').toUpperCase().includes('URGENTE');
                const diasSumar = isUrgente ? 1 : 3;
                const fechaEntrega = new Date(fechaBase);
                fechaEntrega.setDate(fechaEntrega.getDate() + diasSumar);

                let materialDesc = "Varios";
                let varianteDesc = "";

                if (areaObj.materiales.length > 0) {
                    materialDesc = areaObj.materiales[0].nombre;
                    varianteDesc = areaObj.materiales[0].variante;
                } else {
                    materialDesc = "Servicio (Ver Referencias)";
                }

                let magnitudOrden = 0;
                areaObj.materiales.forEach(m => {
                    m.items.forEach(it => magnitudOrden += (it.metros * it.copias));
                });

                const resOrd = await new sql.Request(transaction)
                    .input('AreaID', sql.VarChar, areaObj.areaId)
                    .input('Cliente', sql.NVarChar, pedido.cliente)
                    .input('CodigoOrden', sql.VarChar, codVisual)
                    .input('NoDocERP', sql.VarChar, pedido.nroDoc)
                    .input('IdCabezalERP', sql.VarChar, pedido.nroDoc) // Aquí debería insertar '46'
                    .input('DescTrabajo', sql.NVarChar, pedido.nombreTrabajo)
                    .input('Prioridad', sql.VarChar, pedido.modoEntrega)
                    .input('Nota', sql.NVarChar, pedido.notaGeneral)
                    .input('Tinta', sql.VarChar, areaObj.tinta)
                    .input('Material', sql.VarChar, materialDesc)
                    .input('Variante', sql.VarChar, varianteDesc)
                    .input('Fecha', sql.DateTime, fechaBase)
                    .input('FechaEntrega', sql.DateTime, fechaEntrega)
                    .input('Magnitud', sql.VarChar, magnitudOrden.toFixed(2))
                    .query(`
                        INSERT INTO dbo.Ordenes (
                            AreaID, Cliente, DescripcionTrabajo, Prioridad, Estado, 
                            FechaIngreso, FechaEstimadaEntrega, Material, Variante, CodigoOrden, IdCabezalERP, 
                            NoDocERP, Nota, Tinta, ArchivosCount, Magnitud
                        )
                        OUTPUT INSERTED.OrdenID
                        VALUES (
                            @AreaID, @Cliente, @DescTrabajo, @Prioridad, 'Pendiente', 
                            @Fecha, @FechaEntrega, @Material, @Variante, @CodigoOrden, @IdCabezalERP, 
                            @NoDocERP, @Nota, @Tinta, 0, @Magnitud
                        )
                    `);

                const newId = resOrd.recordset[0].OrdenID;
                console.log(`[DEBUG] Insertada Orden ${newId} (Visual: ${codVisual})`);

                // Archivos Productivos
                let archivosCount = 0;
                for (const mat of areaObj.materiales) {
                    for (const it of mat.items) {
                        archivosCount++;
                        let nombreArchivo = "";
                        if (it.link) {
                            nombreArchivo = `${clean(codVisual)} - ${clean(mat.nombre)} - ${it.tipo}`.substring(0, 150);
                        } else {
                            nombreArchivo = `${clean(mat.nombre)} (Sin Archivo)`;
                        }

                        await new sql.Request(transaction)
                            .input('OID', sql.Int, newId)
                            .input('Nombre', sql.VarChar, nombreArchivo)
                            .input('Ruta', sql.VarChar, it.link)
                            .input('Copias', sql.Int, it.copias)
                            .input('Metros', sql.Decimal(10, 2), it.metros)
                            .input('SubID', sql.Int, it.sublineaId)
                            .input('CodArt', sql.VarChar, it.codArt)
                            .input('Tipo', sql.VarChar, it.tipo)
                            .input('Notas', sql.NVarChar, it.notas)
                            .query(`
                                INSERT INTO dbo.ArchivosOrden (
                                    OrdenID, NombreArchivo, RutaAlmacenamiento, Copias, 
                                    FechaSubida, CodigoArticulo, EstadoArchivo, IdSubLineaERP, Metros, TipoArchivo, Observaciones
                                )
                                VALUES (@OID, @Nombre, @Ruta, @Copias, GETDATE(), @CodArt, 'Pendiente', @SubID, @Metros, @Tipo, @Notas)
                            `);
                    }
                }

                await new sql.Request(transaction)
                    .input('OID', sql.Int, newId)
                    .input('Count', sql.Int, archivosCount)
                    .query("UPDATE Ordenes SET ArchivosCount = @Count WHERE OrdenID = @OID");

                // Archivos Referencia
                for (const ref of areaObj.archivosRef) {
                    await new sql.Request(transaction)
                        .input('OID', sql.Int, newId)
                        .input('Tipo', sql.VarChar(50), ref.tipo)
                        .input('Ubi', sql.VarChar(500), ref.link)
                        .input('Nom', sql.VarChar(200), ref.nombreOriginal.substring(0, 200))
                        .input('Notas', sql.NVarChar(sql.MAX), ref.notas)
                        .query(`
                            INSERT INTO dbo.ArchivosReferencia (
                                OrdenID, TipoArchivo, UbicacionStorage, NombreOriginal, NotasAdicionales, FechaSubida
                            )
                            VALUES (@OID, @Tipo, @Ubi, @Nom, @Notas, GETDATE())
                       `);
                }

                // NO LLAMAMOS SPs EN TEST
                if (!res.locals.isTest) {
                    try {
                        await new sql.Request(transaction).input('OrdenID', sql.Int, newId).execute('sp_PredecirProximoServicio');
                        await new sql.Request(transaction).input('OrdenID', sql.Int, newId).execute('sp_CalcularFechaEntrega');
                    } catch (spErr) { console.warn(`Warning SPs: ${spErr.message}`); }
                }
            }
        }

        if (maxFacturaEncontrada > ultimaFacturaDB && !res.locals.isTest) {
            await new sql.Request(transaction)
                .input('val', sql.VarChar, maxFacturaEncontrada.toString())
                .query("UPDATE ConfiguracionGlobal SET Valor = @val WHERE Clave = 'ULTIMAFACTURA'");
        }

        await transaction.commit();
        res.json({ success: true, message: `Procesado Correctamente. Ordenes: ${codigosGenerados.join(', ')}` });

    } catch (txnErr) {
        await transaction.rollback();
        throw txnErr;
    }
};

exports.syncOrders = async (req, res) => {
    try {
        const pool = await getPool();
        // 1. Obtener config
        const configRes = await pool.request().query("SELECT Valor FROM ConfiguracionGlobal WHERE Clave = 'ULTIMAFACTURA'");
        const ultimaFacturaDB = parseInt(configRes.recordset[0]?.Valor) || 0;

        // 2. Fetch API
        const response = await axios.get(`http://localhost:6061/api/pedidos/todos?NroFact=${ultimaFacturaDB}`);
        let rawPedidos = response.data.data || [];
        rawPedidos = rawPedidos.filter(p => parseInt(p.NroFact) > ultimaFacturaDB);

        if (rawPedidos.length === 0) return res.json({ success: true, message: 'Sin pedidos nuevos.' });

        let fullData = [];
        for (const p of rawPedidos) {
            try {
                const det = await axios.get(`http://localhost:6061/api/pedidos/${p.NroFact}/con_sublineas`);
                let merged = { ...det.data.data, NroFact: p.NroFact };
                fullData.push(merged);
            } catch (e) { console.error(e.message); }
        }

        res.locals.isTest = false;
        await procesarPedidosCore(fullData, pool, res);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.testImportJson = async (req, res) => {
    try {
        const pool = await getPool();
        const data = req.body.data;
        const pedidosArray = Array.isArray(data) ? data : [data];
        res.locals.isTest = true;
        await procesarPedidosCore(pedidosArray, pool, res);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};