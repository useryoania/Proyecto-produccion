const { sql, getPool } = require('../config/db');
const driveService = require('../services/driveService');
const fileProcessingService = require('../services/fileProcessingService');
const axios = require('axios');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// --- CONSTANTES Y MAPEOS ---
const SERVICE_TO_AREA_MAP = {
    'dtf': 'DF',
    'DF': 'DF',
    'sublimacion': 'SB',
    'ecouv': 'ECOUV',
    'directa_320': 'DIRECTA',
    'directa_algodon': 'DIRECTA',
    'bordado': 'EMB',
    'laser': 'TWC',
    'tpu': 'TPU',
    'costura': 'TWT',
    'estampado': 'EST'
};

// --- CONTROLADOR DE INTEGRACIÓN (Planilla) ---
exports.createPlanillaOrder = async (req, res) => {
    console.log("📥 [IntegrationOrder] Iniciando proceso de creación desde Planilla...");

    // --- 1. DATOS BÁSICOS ---
    const {
        idServicio, nombreTrabajo, prioridad, notasGenerales, configuracion,
        especificacionesCorte, lineas, archivosReferencia, archivosTecnicos, serviciosExtras
    } = req.body;

    const serviceId = idServicio || req.body.serviceId;
    const jobName = nombreTrabajo || req.body.jobName;
    const urgency = prioridad || req.body.urgency || 'Normal';
    const generalNote = notasGenerales || req.body.generalNote;
    const items = lineas || req.body.items || [];
    const selectedComplementary = serviciosExtras || req.body.selectedComplementary || {};

    const referenceFiles = (archivosReferencia || req.body.referenceFiles || []).map(f => ({
        name: f.nombre || f.name,
        type: f.tipo || f.type
    }));
    const specializedFiles = (archivosTecnicos || req.body.specializedFiles || []).map(f => ({
        name: f.nombre || f.name,
        type: f.tipo || f.type
    }));

    const cuttingSpecs = especificacionesCorte || req.body.cuttingSpecs;

    // --- VALIDACIÓN DE CLIENTE (OBLIGATORIO PARA INTEGRACIÓN) ---
    const codCliente = req.body.codCliente;
    if (!codCliente) {
        return res.status(400).json({ error: "El campo 'codCliente' es obligatorio para pedidos de integración." });
    }

    const nombreCliente = req.body.nombreCliente || 'Cliente Externo';
    let idClienteReact = null; // Se buscará en DB

    if ((!items || items.length === 0) && (!req.body.servicios || req.body.servicios.length === 0)) {
        return res.status(400).json({ error: "El pedido no contiene ítems." });
    }

    const pool = await getPool();

    try {
        // --- 2. RESERVAR NRO PEDIDO ---
        const reserveRes = await pool.request().query(`
            UPDATE ConfiguracionGlobal 
            SET Valor = CAST(ISNULL(CAST(Valor AS INT), 0) + 1 AS VARCHAR) 
            OUTPUT INSERTED.Valor 
            WHERE Clave = 'ULTIMOPEDIDOWEB'
        `);
        if (!reserveRes.recordset.length) throw new Error("No se pudo obtener el próximo número de pedido.");
        const nuevoNroPedido = parseInt(reserveRes.recordset[0].Valor);
        const erpDocNumber = `${nuevoNroPedido}`;

        // Buscar IDReact del cliente
        const clientRes = await pool.request().input('cod', sql.Int, codCliente).query("SELECT IDReact FROM Clientes WHERE CodCliente = @cod");
        if (clientRes.recordset.length > 0) idClienteReact = clientRes.recordset[0].IDReact;

        // --- 3. PREPARACIÓN DE ÁREAS Y RUTAS ---
        const mappingRes = await pool.request().query("SELECT AreaID_Interno, Numero FROM ConfigMapeoERP");
        const mapaAreasNumero = {};
        mappingRes.recordset.forEach(r => mapaAreasNumero[r.AreaID_Interno.trim().toUpperCase()] = r.Numero || 999);

        const areasRes = await pool.request().query("SELECT AreaID, UM FROM Areas");
        const mapaAreasUM = {};
        areasRes.recordset.forEach(r => {
            if (r.AreaID) mapaAreasUM[r.AreaID.trim().toUpperCase()] = (r.UM || 'u').trim();
        });

        const mainAreaID = (SERVICE_TO_AREA_MAP[serviceId] || 'GENE').toUpperCase();
        const EXTRA_ID_TO_AREA = { 'EST': 'EST', 'ESTAMPADO': 'EST', 'COSTURA': 'TWT', 'CORTE': 'TWC', 'TWC': 'TWC', 'TWT': 'TWT', 'LASER': 'TWC', 'BORDADO': 'EMB', 'EMB': 'EMB' };

        // Inicializar conjunto de áreas activas
        const allActiveAreas = new Set([mainAreaID]);

        // A) Desde Servicios Nuevos (Payload Nuevo)
        if (req.body.servicios && Array.isArray(req.body.servicios)) {
            req.body.servicios.forEach(s => {
                if (s.areaId) allActiveAreas.add(s.areaId.toUpperCase());
            });
        }

        // B) Legacy
        if (selectedComplementary) {
            Object.entries(selectedComplementary).forEach(([id, val]) => {
                if (val.activo || val.active) {
                    const mapped = EXTRA_ID_TO_AREA[id.toUpperCase()];
                    if (mapped) allActiveAreas.add(mapped);
                }
            });
        }

        // --- 4. PREPARAR NOTA ---
        let finalNote = generalNote || '';
        const specs = [];
        if (cuttingSpecs) {
            specs.push(`MOLDE: ${cuttingSpecs.tipoMolde || cuttingSpecs.moldType || 'N/A'}`);
            specs.push(`ORIGEN TELA: ${cuttingSpecs.origenTela || cuttingSpecs.fabricOrigin || 'N/A'}`);
            if ((cuttingSpecs.nombreTelaCliente || cuttingSpecs.clientFabricName) && (cuttingSpecs.origenTela === 'TELA CLIENTE' || cuttingSpecs.fabricOrigin === 'TELA CLIENTE')) {
                specs.push(`TELA CLIENTE: ${cuttingSpecs.nombreTelaCliente || cuttingSpecs.clientFabricName}`);
            }
            if (cuttingSpecs.idOrdenSublimacionVinc || cuttingSpecs.sublimationOrderId) {
                specs.push(`ORDEN ASOCIADA: ${cuttingSpecs.idOrdenSublimacionVinc || cuttingSpecs.sublimationOrderId}`);
            }
        }
        if (req.body.especificacionesBordado?.cantidadPrendas) specs.push(`BORDADO - CANTIDAD TOTAL DE PRENDAS: ${req.body.especificacionesBordado.cantidadPrendas}`);

        if (specs.length > 0) {
            finalNote = specs.join(' | ') + ' | ' + (generalNote || '');
        } else {
            finalNote = generalNote ? `OBS: ${generalNote}` : '';
        }

        // --- 5. ESTRUCTURAR ORDENES ---
        const pendingOrderExecutions = [];

        // CASO 1: ARRAY UNIFICADO DE SERVICIOS
        if (req.body.servicios && Array.isArray(req.body.servicios) && req.body.servicios.length > 0) {
            req.body.servicios.forEach(srv => {
                const cabecera = srv.cabecera || {};
                const areaID = (srv.areaId || mainAreaID).toUpperCase();
                const prodTypes = ['PRODUCCION', 'PRODUCCION_DORSO', 'IMPRESION'];
                const rawFiles = srv.archivos || [];

                const ordenItems = (srv.items || []).map(it => {
                    let obsTecnicas = it.printSettings?.observation || '';
                    if (it.printSettings) {
                        const parts = [];
                        if (it.printSettings.mode && it.printSettings.mode !== 'normal') parts.push(`Modo: ${it.printSettings.mode}`);
                        if (it.printSettings.rapport) parts.push(`Rapport: ${it.printSettings.rapport}`);
                        if (it.printSettings.finalWidthM) parts.push(`AnchoFinal: ${it.printSettings.finalWidthM}m`);
                        if (parts.length > 0) obsTecnicas += (obsTecnicas ? ' | ' : '') + parts.join(', ');
                    }
                    return {
                        fileName: it.fileName,
                        fileBackName: it.fileBackName,
                        copies: it.cantidad || 1,
                        note: it.nota,
                        width: it.width,
                        height: it.height,
                        observaciones: obsTecnicas,
                        widthBack: it.widthBack,
                        heightBack: it.heightBack,
                        observacionesBack: it.observacionesBack
                    };
                });

                const ordenReferencias = rawFiles.filter(f => !prodTypes.includes(f.tipo));

                let finalCodArt = cabecera.codArticulo || cabecera.codArt;
                let finalCodStock = cabecera.codStock;

                if (!finalCodArt && cabecera.material && typeof cabecera.material === 'object') {
                    finalCodArt = cabecera.material.codArt || cabecera.material.codArticulo;
                    finalCodStock = cabecera.material.codStock;
                }

                let serviceNote = srv.notas || '';
                let techInfo = '';

                if (srv.metadata) {
                    const metaParts = [];
                    if (srv.metadata.prendas) metaParts.push(`Prendas: ${srv.metadata.prendas}`);
                    if (srv.metadata.estampadosPorPrenda) metaParts.push(`Bajadas: ${srv.metadata.estampadosPorPrenda}`);
                    if (srv.metadata.origen) metaParts.push(`Origen: ${srv.metadata.origen}`);
                    if (srv.metadata.moldType) metaParts.push(`Molde: ${srv.metadata.moldType}`);
                    if (srv.metadata.fabricOrigin) metaParts.push(`Tela: ${srv.metadata.fabricOrigin}`);

                    if (metaParts.length > 0) {
                        techInfo = metaParts.join(', ');
                        serviceNote = (serviceNote ? serviceNote + '\n' : '') + `[DATOS TÉCNICOS] ${techInfo}`;
                    }
                }

                pendingOrderExecutions.push({
                    areaID: areaID,
                    material: cabecera.material?.name || cabecera.material || 'Estándar',
                    variante: cabecera.variante || 'N/A',
                    codArticulo: finalCodArt,
                    codStock: finalCodStock,
                    items: ordenItems,
                    referencias: ordenReferencias,
                    isExtra: !srv.esPrincipal,
                    extraOriginId: srv.areaId,
                    magnitudInicial: 0,
                    notaAdicional: serviceNote,
                    techInfo: techInfo
                });
            });

            // CASO 2: ESTRUCTURA VIEJA
        } else if (lineas && lineas.length > 0) {
            lineas.forEach(linea => {
                const cabecera = linea.cabecera || {};
                const sublineas = linea.sublineas || [];
                pendingOrderExecutions.push({
                    areaID: mainAreaID,
                    material: cabecera.material,
                    variante: cabecera.variante,
                    codArticulo: cabecera.codArticulo,
                    codStock: cabecera.codStock,
                    idProductoReact: cabecera.idProductoReact || cabecera.material?.id,
                    items: sublineas.map(sl => ({
                        fileName: sl.archivoPrincipal?.name,
                        fileBackName: sl.archivoDorso?.name,
                        copies: sl.cantidad,
                        note: sl.nota,
                        width: sl.width,
                        height: sl.height,
                        widthBack: sl.widthBack,
                        heightBack: sl.heightBack,
                        observaciones: sl.archivoPrincipal?.observaciones || ''
                    })),
                    referencias: [],
                    isExtra: false,
                    notaAdicional: '',
                    techInfo: ''
                });
            });
        }

        // --- 5B. SORTING ---
        pendingOrderExecutions.sort((a, b) => {
            const idA = (a.areaID || '').toUpperCase().trim();
            const idB = (b.areaID || '').toUpperCase().trim();
            const pA = mapaAreasNumero[idA] !== undefined ? mapaAreasNumero[idA] : 999;
            const pB = mapaAreasNumero[idB] !== undefined ? mapaAreasNumero[idB] : 999;
            return pA - pB;
        });

        // LOOKUP IDs
        const codesToLookup = [...new Set(pendingOrderExecutions.map(e => e.codArticulo).filter(c => c))];
        if (codesToLookup.length > 0) {
            try {
                const request = pool.request();
                const clauses = codesToLookup.map((_, i) => `CodigoArticulo = @cod${i}`).join(' OR ');
                codesToLookup.forEach((c, i) => request.input(`cod${i}`, sql.VarChar(50), c));
                const artRes = await request.query(`SELECT Id, CodigoArticulo FROM Articulos WHERE ${clauses}`);
                const mapArtId = {};
                artRes.recordset.forEach(r => {
                    if (r.CodigoArticulo) mapArtId[r.CodigoArticulo.trim().toUpperCase()] = r.Id;
                });
                pendingOrderExecutions.forEach(exec => {
                    if (exec.codArticulo && !exec.idProductoReact) {
                        const foundId = mapArtId[exec.codArticulo.trim().toUpperCase()];
                        if (foundId) exec.idProductoReact = foundId;
                    }
                });
            } catch (lookupErr) { console.warn("Lookup Error", lookupErr.message); }
        }

        // --- 6. TRANSACCIÓN DB ---
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const filesToUpload = [];
            const generatedOrders = [];
            const generatedIDs = [];
            const timestamp = Date.now();

            for (let idx = 0; idx < pendingOrderExecutions.length; idx++) {
                const exec = pendingOrderExecutions[idx];
                const globalIndex = idx + 1;
                const docNumber = pendingOrderExecutions.length > 1 ? `${erpDocNumber} (${globalIndex}/${pendingOrderExecutions.length})` : erpDocNumber;
                exec.codigoOrden = `ORD-${docNumber}`;

                const sanitize = (str) => (str || '').replace(/[<>:"/\\|?*]/g, '_').trim();
                let proximoServicio = 'DEPOSITO';
                for (let k = idx + 1; k < pendingOrderExecutions.length; k++) {
                    const nextExec = pendingOrderExecutions[k];
                    if (nextExec.areaID !== exec.areaID) {
                        proximoServicio = nextExec.areaID;
                        break;
                    }
                }
                const areaUM = mapaAreasUM[exec.areaID] || 'u';
                const combinedNote = [finalNote, exec.notaAdicional].filter(n => n && n.trim()).join(' | ');

                const resOrder = await new sql.Request(transaction)
                    .input('AreaID', sql.VarChar(20), exec.areaID)
                    .input('Cliente', sql.NVarChar(200), nombreCliente)
                    .input('CodCliente', sql.Int, codCliente)
                    .input('IdClienteReact', sql.VarChar(50), idClienteReact ? idClienteReact.toString() : null)
                    .input('Desc', sql.NVarChar(300), jobName)
                    .input('Prio', sql.VarChar(20), urgency)
                    .input('Mat', sql.VarChar(255), exec.material)
                    .input('Var', sql.VarChar(100), exec.variante)
                    .input('Cod', sql.VarChar(50), exec.codigoOrden)
                    .input('ERP', sql.VarChar(50), erpDocNumber)
                    .input('Nota', sql.NVarChar(sql.MAX), combinedNote)
                    .input('Mag', sql.VarChar(50), String(exec.magnitudInicial || '0'))
                    .input('Prox', sql.VarChar(50), proximoServicio)
                    .input('Estado', sql.VarChar(50), 'Cargando...')
                    .input('UM', sql.VarChar(20), areaUM)
                    .input('CodArt', sql.VarChar(50), exec.codArticulo || null)
                    .input('IdProdReact', sql.Int, exec.idProductoReact || null)
                    .query(`
                        INSERT INTO Ordenes (
                            AreaID, Cliente, CodCliente, IdClienteReact, DescripcionTrabajo, Prioridad, 
                            FechaIngreso, FechaEstimadaEntrega, Material, Variante, 
                            CodigoOrden, NoDocERP, Nota, Magnitud, ProximoServicio, UM, Estado, EstadoenArea,
                            CodArticulo, IdProductoReact
                        )
                        OUTPUT INSERTED.OrdenID
                        VALUES (
                            @AreaID, @Cliente, @CodCliente, @IdClienteReact, @Desc, @Prio, 
                            GETDATE(), DATEADD(day, 3, GETDATE()), @Mat, @Var, 
                            @Cod, @ERP, @Nota, @Mag, @Prox, @UM, @Estado, @Estado,
                            @CodArt, @IdProdReact
                        )
                    `);

                const newOID = resOrder.recordset[0].OrdenID;
                generatedOrders.push(exec.codigoOrden);
                generatedIDs.push(newOID);

                let totalMagnitud = 0;
                let fileCount = 0;

                for (let i = 0; i < exec.items.length; i++) {
                    const item = exec.items[i];
                    const umLower = areaUM.toLowerCase();

                    // FRENTE
                    if (item.fileName) {
                        const wM = parseFloat(item.width) || 0;
                        const hM = parseFloat(item.height) || 0;
                        let valMetros = 0;
                        if (umLower === 'm2') valMetros = (wM * hM);
                        else if (umLower === 'm') valMetros = hM;

                        const parts = item.fileName.split('.');
                        const ext = parts.length > 1 ? `.${parts.pop()}` : '';
                        const finalName = `${exec.codigoOrden.replace(/\//g, '-')}_${sanitize(nombreCliente)}_${sanitize(jobName)}_Archivo ${i + 1} de ${exec.items.length} (x${item.copies || 1})${ext}`;

                        const resFile = await new sql.Request(transaction)
                            .input('OID', sql.Int, newOID)
                            .input('Nom', sql.VarChar(200), finalName)
                            .input('Tipo', sql.VarChar(50), 'Impresion')
                            .input('Cop', sql.Int, item.copies || 1)
                            .input('Met', sql.Decimal(10, 3), valMetros)
                            .input('Ancho', sql.Decimal(10, 2), wM)
                            .input('Alto', sql.Decimal(10, 2), hM)
                            .input('Obs', sql.NVarChar(sql.MAX), item.observaciones || '')
                            .input('CodArt', sql.VarChar(50), exec.codArticulo || null)
                            .query(`INSERT INTO ArchivosOrden (OrdenID, NombreArchivo, TipoArchivo, Copias, Metros, EstadoArchivo, FechaSubida, Ancho, Alto, Observaciones, CodigoArticulo) OUTPUT INSERTED.ArchivoID VALUES (@OID, @Nom, @Tipo, @Cop, @Met, 'Pendiente', GETDATE(), @Ancho, @Alto, @Obs, @CodArt)`);

                        filesToUpload.push({ dbId: resFile.recordset[0].ArchivoID, type: 'ORDEN', originalName: item.fileName, finalName: finalName, area: exec.areaID });

                        if (umLower === 'u') totalMagnitud += (item.copies || 1);
                        else totalMagnitud += (valMetros * (item.copies || 1));

                        fileCount++;
                    }

                    // DORSO
                    if (item.fileBackName) {
                        const wM = parseFloat(item.widthBack) || 0;
                        const hM = parseFloat(item.heightBack) || 0;
                        let valMetros = 0;
                        if (umLower === 'ml') valMetros = hM;
                        else if (umLower === 'm2') valMetros = wM * hM;

                        const parts = item.fileBackName.split('.');
                        const ext = parts.length > 1 ? `.${parts.pop()}` : '';
                        const finalName = `${exec.codigoOrden.replace(/\//g, '-')}_${sanitize(nombreCliente)}_${sanitize(jobName)}_DORSO Archivo ${i + 1} de ${exec.items.length} (x${item.copies || 1})${ext}`;

                        const resFile = await new sql.Request(transaction)
                            .input('OID', sql.Int, newOID)
                            .input('Nom', sql.VarChar(200), finalName)
                            .input('Tipo', sql.VarChar(50), 'Impresion')
                            .input('Cop', sql.Int, item.copies || 1)
                            .input('Met', sql.Decimal(10, 3), valMetros)
                            .input('Ancho', sql.Decimal(10, 2), wM)
                            .input('Alto', sql.Decimal(10, 2), hM)
                            .input('Obs', sql.NVarChar(sql.MAX), (item.observacionesBack || '') + ' [DORSO]')
                            .input('CodArt', sql.VarChar(50), exec.codArticulo || null)
                            .query(`INSERT INTO ArchivosOrden (OrdenID, NombreArchivo, TipoArchivo, Copias, Metros, EstadoArchivo, FechaSubida, Ancho, Alto, Observaciones, CodigoArticulo) OUTPUT INSERTED.ArchivoID VALUES (@OID, @Nom, @Tipo, @Cop, @Met, 'Pendiente', GETDATE(), @Ancho, @Alto, @Obs, @CodArt)`);

                        filesToUpload.push({ dbId: resFile.recordset[0].ArchivoID, type: 'ORDEN', originalName: item.fileBackName, finalName: finalName, area: exec.areaID });
                        if (umLower !== 'u') totalMagnitud += (valMetros * (item.copies || 1));
                        fileCount++;
                    }
                } // End items

                if (fileCount > 0) {
                    await new sql.Request(transaction).input('OID', sql.Int, newOID).input('C', sql.Int, fileCount).input('Mag', sql.Decimal(10, 2), totalMagnitud).query("UPDATE Ordenes SET ArchivosCount = @C, Magnitud = CAST(@Mag AS VARCHAR) WHERE OrdenID = @OID");
                }

                // REFERENCIAS (Vinculadas)
                if (exec.referencias) {
                    for (const ref of exec.referencias) {
                        const fName = `REF-${erpDocNumber}-${sanitize(ref.name)}`;
                        const resRef = await new sql.Request(transaction).input('OID', sql.Int, newOID).input('Tipo', sql.VarChar(50), ref.tipo || 'REFERENCIA').input('Nom', sql.VarChar(200), fName).query(`INSERT INTO ArchivosReferencia (OrdenID, TipoArchivo, NombreOriginal, FechaSubida, UbicacionStorage) OUTPUT INSERTED.RefID VALUES (@OID, @Tipo, @Nom, GETDATE(), 'Pendiente')`);
                        filesToUpload.push({ dbId: resRef.recordset[0].RefID, type: 'REF', originalName: ref.name, finalName: fName, area: 'GENERAL' });
                    }
                }

                // ServiciosExtraOrden
                if (exec.isExtra || ['EST', 'EMB', 'TWT', 'TWC'].includes(exec.areaID)) {
                    let qtyFact = exec.magnitudInicial || 0;
                    if (qtyFact === 0 && exec.items && exec.items.length > 0) qtyFact = exec.items.reduce((sum, it) => sum + (parseInt(it.copies) || 1), 0);
                    if (qtyFact === 0) qtyFact = 1;
                    if (exec.codArticulo) {
                        await new sql.Request(transaction).input('OID', sql.Int, newOID).input('Cod', sql.VarChar(50), exec.codArticulo).input('Stk', sql.VarChar(50), exec.codStock || '').input('Des', sql.NVarChar(255), `${exec.variante} - ${exec.material}`).input('Cnt', sql.Decimal(18, 2), qtyFact).input('Obs', sql.NVarChar(sql.MAX), exec.techInfo || 'Generado desde IntegrationOrder').query(`INSERT INTO ServiciosExtraOrden (OrdenID, CodArt, CodStock, Descripcion, Cantidad, PrecioUnitario, TotalLinea, Observacion, FechaRegistro) VALUES (@OID, @Cod, @Stk, @Des, @Cnt, 0, 0, @Obs, GETDATE())`);
                    }
                }

                // ARCHIVOS GENERALES (SOLO 1 VEZ)
                if (idx === 0) {
                    for (const rf of referenceFiles) {
                        const fName = `REF-${erpDocNumber}-${sanitize(rf.name)}`;
                        const resRef = await new sql.Request(transaction).input('OID', sql.Int, newOID).input('Tipo', sql.VarChar(50), rf.type || 'REFERENCIA').input('Nom', sql.VarChar(200), fName).query(`INSERT INTO ArchivosReferencia (OrdenID, TipoArchivo, NombreOriginal, FechaSubida, UbicacionStorage) OUTPUT INSERTED.RefID VALUES (@OID, @Tipo, @Nom, GETDATE(), 'Pendiente')`);
                        filesToUpload.push({ dbId: resRef.recordset[0].RefID, type: 'REF', originalName: rf.name, finalName: fName, area: 'GENERAL' });
                    }
                    for (const sf of specializedFiles) {
                        const finalNameSpec = `SPEC-${erpDocNumber}-${sanitize(sf.name)}`;
                        const resRef = await new sql.Request(transaction).input('OID', sql.Int, newOID).input('Tipo', sql.VarChar(50), sf.type || 'ESPECIALIZADO').input('Nom', sql.VarChar(200), finalNameSpec).query(`INSERT INTO ArchivosReferencia (OrdenID, TipoArchivo, NombreOriginal, FechaSubida, UbicacionStorage) OUTPUT INSERTED.RefID VALUES (@OID, @Tipo, @Nom, GETDATE(), 'Pendiente')`);
                        filesToUpload.push({ dbId: resRef.recordset[0].RefID, type: 'REF', originalName: sf.name, finalName: finalNameSpec, area: 'GENERAL' });
                    }
                }

            } // End main loop

            // AUTO-ACTIVAR
            for (const oid of generatedIDs) {
                const checkRes = await new sql.Request(transaction).input('OID', sql.Int, oid).query(`SELECT (SELECT COUNT(*) FROM ArchivosOrden WHERE OrdenID = @OID AND EstadoArchivo != 'Cancelado') as TotalProd, (SELECT COUNT(*) FROM ArchivosOrden WHERE OrdenID = @OID AND RutaAlmacenamiento IS NULL AND EstadoArchivo != 'Cancelado') as PendProd, (SELECT COUNT(*) FROM ArchivosReferencia WHERE OrdenID = @OID) as TotalRef, (SELECT COUNT(*) FROM ArchivosReferencia WHERE OrdenID = @OID AND UbicacionStorage = 'Pendiente') as PendRef`);
                if (checkRes.recordset.length > 0) {
                    const { PendProd, PendRef } = checkRes.recordset[0];
                    if ((PendProd + PendRef) === 0) {
                        await new sql.Request(transaction).input('OID', sql.Int, oid).query(`UPDATE Ordenes SET Estado = 'Pendiente', EstadoenArea = 'Pendiente' WHERE OrdenID = @OID AND Estado = 'Cargando...'`);
                    }
                }
            }

            await transaction.commit();

            console.log("✅ [IntegrationOrder] Pedido creado:", generatedOrders);
            res.status(201).json({
                success: true,
                message: "Orden creada exitosamente (Integra)",
                orderId: generatedIDs[0],
                uuid: generatedOrders[0],
                subOrders: generatedOrders,
                filesToUpload
            });

        } catch (errTrx) {
            await transaction.rollback();
            throw errTrx;
        }

    } catch (err) {
        console.error("❌ IntegrationOrder Error:", err);
        res.status(500).json({ error: "Error al crear pedido de integración: " + err.message });
    }
};
