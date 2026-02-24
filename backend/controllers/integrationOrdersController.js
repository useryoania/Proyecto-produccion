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
    'SB': 'SB',
    'SUB': 'SB',
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
    // console.log("Payload recibido:", JSON.stringify(req.body, null, 2));

    // --- DEBUG SOLICITADO POR EL USUARIO ---
    console.log("=========================================================");
    console.log("🚨 NUEVO PEDIDO LLEGANDO DESDE GOOGLE SHEETS / WEB:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("=========================================================");

    // --- 1. DATOS BÁSICOS & ADAPTACIÓN DE FORMATO ---
    const {
        idServicio, idServicioBase, // Soporte dual
        nombreTrabajo, prioridad, notasGenerales, configuracion,
        especificacionesCorte, lineas, archivosReferencia, archivosTecnicos, serviciosExtras,
        clienteInfo, // Nuevo objeto de cliente
        rowNumber // Fila de la planilla
    } = req.body;

    // Variables de Validación (NUEVOS CAMPOS)
    let esValido = true;
    let observacionesValidacion = [];

    // Mapeo inteligente de ID de Servicio
    let serviceId = idServicio || idServicioBase || req.body.serviceId;
    if (typeof serviceId === 'object') serviceId = serviceId.id || 'GENE';

    // Asegurar que jobName sea string
    const rawJobName = nombreTrabajo || req.body.jobName || 'Trabajo Sin Nombre';
    const jobName = String(rawJobName);

    const urgency = prioridad || req.body.urgency || 'Normal';
    const generalNote = notasGenerales || req.body.generalNote; // SOLO LA NOTA DEL CLIENTE
    const items = lineas || req.body.items || [];
    const selectedComplementary = serviciosExtras || req.body.selectedComplementary || {};

    // --- 2. RESOLUCIÓN DE CLIENTE ---
    const pool = await getPool();
    let codCliente = req.body.codCliente;
    let nombreCliente = req.body.nombreCliente;
    let idClienteReact = null;

    // Lógica de Búsqueda por Nombre/ID String (ej: "LAY12")
    if (!codCliente && clienteInfo && clienteInfo.id) {
        console.log(`🔍 Buscando cliente por ID/Nombre: '${clienteInfo.id}'...`);
        try {
            const clientSearch = await pool.request()
                .input('Val', sql.NVarChar, clienteInfo.id.trim())
                .query(`
                    SELECT TOP 1 CodCliente, Nombre, IDReact, IDCliente
                    FROM Clientes 
                    WHERE LTRIM(RTRIM(IDCliente)) = @Val 
                       OR Nombre LIKE '%' + @Val + '%'
                `);

            if (clientSearch.recordset.length > 0) {
                const c = clientSearch.recordset[0];
                codCliente = c.CodCliente;
                // USAR IDCliente (RXDSUBLIMACION) como nombre principal SOLO SI TIENE CONTENIDO. Si es espacio, usar Nombre.
                nombreCliente = (c.IDCliente && c.IDCliente.trim().length > 0) ? c.IDCliente : c.Nombre;
                idClienteReact = c.IDReact;
                console.log(`✅ Cliente encontrado: ${nombreCliente} (Ref DB: ${c.Nombre})`);

                if (!idClienteReact) {
                    console.warn(`⚠️ Cliente '${nombreCliente}' encontrado pero SIN IDReact.`);
                    // NO invalidamos la orden. Permitimos que entre con CodCliente aunque falte IDReact.
                    observacionesValidacion.push(`Cliente existe (Cod: ${codCliente}) pero sin IDReact.`);
                }
            } else {
                console.warn(`⚠️ Cliente '${clienteInfo.id}' no encontrado.`);
                esValido = false;
                observacionesValidacion.push(`Cliente '${clienteInfo.id}' no encontrado en BD.`);

                // REQUERIDO: Usar el ID en nombre para no perderlo, pero anular idClienteReact para evitar varchar-to-numeric SQL Crash
                if (!nombreCliente) nombreCliente = `Cliente ${clienteInfo.id}`;
                idClienteReact = null;
            }
        } catch (errSearch) {
            console.error("Error buscando cliente:", errSearch);
            esValido = false;
            observacionesValidacion.push("Error interno al buscar cliente.");

            // Fallback (solo ponerlo en nombre, NO inyectar texto puro en IDReact para evitar crash SQL)
            if (!nombreCliente) nombreCliente = `Cliente ${clienteInfo.id}`;
            idClienteReact = null;
        }
    }

    if (!codCliente) {
        if (esValido) { // Si no falló la búsqueda anterior pero sigue vacío
            esValido = false;
            observacionesValidacion.push("No se proporcionó CodCliente ni ID válido.");
        }
    }

    if (!nombreCliente) nombreCliente = `Cliente ${codCliente || 'Desconocido'}`;

    // --- VALIDACIÓN DE ITEMS ---
    if ((!items || items.length === 0) && (!req.body.servicios || req.body.servicios.length === 0)) {
        return res.status(400).json({ error: "El pedido no contiene ítems (servicios o lineas vacío)." });
    }

    const referenceFiles = (archivosReferencia || req.body.referenceFiles || []).map(f => ({
        name: f.nombre || f.name,
        type: f.tipo || f.type
    }));

    const cuttingSpecs = especificacionesCorte || req.body.cuttingSpecs;

    try {
        // --- 3. GESTIÓN DE NÚMERO DE ORDEN (Híbrido: Planilla vs Web) ---
        let nuevoNroPedido;
        let erpDocNumber;
        let codigoOrdenFinal;

        let codigoExterno = req.body.idExterno || req.body.codigoExterno;

        // Limpiar nota general (remover prefijo "FILA X: CODE")
        let cleanedNote = generalNote || '';
        if (generalNote) {
            // Regex para remover "FILA 1234: DF-82039" al inicio
            cleanedNote = generalNote.replace(/^FILA \d+:\s*[A-Z0-9-]+\s*/i, '').trim();
        }

        if (!codigoExterno && generalNote) {
            // Extraer código externo de la nota original antes de limpiarla, si es necesario
            const match = generalNote.match(/FILA \d+:\s*([^\s]+)/);
            if (match && match[1]) {
                codigoExterno = match[1];
            }
        }

        if (codigoExterno) {
            // console.log(`ℹ️ [Integration] Usando Código Externo de Planilla: ${codigoExterno}`);
            codigoOrdenFinal = codigoExterno;

            // LÓGICA NoDocERP: "SOLO EL CODIGO" (Pedido explícito del usuario)
            erpDocNumber = codigoExterno;
        } else {
            const reserveRes = await pool.request().query(`
                UPDATE ConfiguracionGlobal 
                SET Valor = CAST(ISNULL(CAST(Valor AS INT), 0) + 1 AS VARCHAR) 
                OUTPUT INSERTED.Valor 
                WHERE Clave = 'ULTIMOPEDIDOWEB'
            `);

            if (reserveRes.recordset.length > 0) {
                nuevoNroPedido = parseInt(reserveRes.recordset[0].Valor);
            } else {
                const maxOrder = await pool.request().query("SELECT MAX(OrdenID) as MaxID FROM Ordenes");
                nuevoNroPedido = (maxOrder.recordset[0].MaxID || 100000) + 1;
            }
            erpDocNumber = `${nuevoNroPedido}`;
            codigoOrdenFinal = `ORD-${erpDocNumber}`;

            if (rowNumber) {
                erpDocNumber = `Fila: ${rowNumber} - Orden: ${nuevoNroPedido}`;
            }
        }

        if (!idClienteReact && codCliente) {
            const parsedCod = parseInt(codCliente);
            if (!isNaN(parsedCod)) {
                const clientRes = await pool.request().input('cod', sql.Int, parsedCod).query("SELECT IDReact FROM Clientes WHERE CodCliente = @cod");
                if (clientRes.recordset.length > 0) idClienteReact = clientRes.recordset[0].IDReact;

                if (!idClienteReact) {
                    // NO invalidamos. Permitimos con CodCliente.
                    observacionesValidacion.push(`IDReact no enccontrado para CodCliente ${parsedCod}`);
                }
            } else {
                observacionesValidacion.push(`CodCliente inválido omitido: ${codCliente}`);
                codCliente = null; // Wipe invalid value so it won't crash later
            }
        }

        // --- 4. PREPARACIÓN DE ÁREAS Y RUTAS ---
        const areasRes = await pool.request().query("SELECT AreaID, UM FROM Areas");
        const mapaAreasUM = {};
        areasRes.recordset.forEach(r => {
            if (r.AreaID) mapaAreasUM[r.AreaID.trim().toUpperCase()] = (r.UM || 'u').trim();
        });

        const mainAreaID = (SERVICE_TO_AREA_MAP[serviceId] || 'GENE').toUpperCase();

        // --- 5. ESTRUCTURAR ORDENES ---
        const pendingOrderExecutions = [];

        if (req.body.servicios && Array.isArray(req.body.servicios) && req.body.servicios.length > 0) {
            req.body.servicios.forEach(srv => {
                const cabecera = srv.cabecera || {};
                let srvArea = srv.areaId || mainAreaID;
                if (SERVICE_TO_AREA_MAP[srvArea]) srvArea = SERVICE_TO_AREA_MAP[srvArea]; // Remapear alias
                const areaID = srvArea.toUpperCase();

                const ordenItems = (srv.items || []).map(it => {
                    let obsTecnicas = it.printSettings?.observation || '';
                    if (it.printSettings?.mode && it.printSettings.mode !== 'normal') {
                        obsTecnicas += (obsTecnicas ? ' | ' : '') + `Modo: ${it.printSettings.mode}`;
                    }

                    let fName = it.fileName || 'SinNombre.dat';

                    return {
                        fileName: fName,
                        originalUrl: it.fileName,
                        copies: it.cantidad || 1,
                        note: it.nota,
                        width: it.width,
                        height: it.height,
                        observaciones: obsTecnicas
                    };
                });

                let localMaterial = cabecera.material || 'Estándar';
                let localVariante = cabecera.variante || 'N/A';
                let localCodArticulo = cabecera.codArticulo;
                let localCodStock = cabecera.codStock;

                // --- HARCODEO DE EXTRAS (BORDADO, CORTE LASER, COSTURA) ---
                if (localCodArticulo === 'SERV-CORTE') {
                    localCodArticulo = '112';
                    localCodStock = '1.1.6.1';
                    localMaterial = 'Corte Laser personalizado';
                    localVariante = 'Corte Laser';
                } else if (localCodArticulo === 'SERV-COSTURA') {
                    localCodArticulo = '115';
                    localCodStock = '1.1.7.1';
                    localMaterial = 'Costura';
                    localVariante = 'Costura';
                } else if (localCodArticulo === 'SERV-BORDADO') {
                    localCodArticulo = '109';
                    localCodStock = '1.1.4.1';
                    localMaterial = 'Bordado personalizado';
                    localVariante = 'Bordado';
                }

                pendingOrderExecutions.push({
                    areaID: areaID,
                    material: localMaterial,
                    variante: localVariante,
                    codArticulo: localCodArticulo,
                    codStock: localCodStock,
                    items: ordenItems,
                    isExtra: !srv.esPrincipal,
                    notaAdicional: srv.notas || ''
                });
            });

        } else if (items && items.length > 0) {
            pendingOrderExecutions.push({
                areaID: mainAreaID,
                material: 'Estándar',
                items: items.map(sl => ({
                    fileName: sl.fileName || sl.archivoPrincipal?.name || 'SinNombre.dat',
                    originalUrl: sl.fileName || sl.archivoPrincipal?.name,
                    copies: sl.copies || sl.cantidad || 1,
                    note: sl.nota || '',
                    width: sl.width || 0,
                    height: sl.height || 0,
                    observaciones: sl.printSettings?.observation || (sl.configuracion?.mode && sl.configuracion.mode !== 'normal' ? `Modo: ${sl.configuracion.mode}` : '')
                })),
                isExtra: false
            });
        }

        // --- 5B. LOOKUP ID PRODUCTO REACT (NUEVO & ROBUSTO) ---
        // Buscamos IDProdReact en la tabla Articulos usando el CodArticulo (ej: 47)
        const codesToLookup = [...new Set(pendingOrderExecutions.map(e => e.codArticulo).filter(c => c))];
        const mapArt = {};

        if (codesToLookup.length > 0) {
            console.log(`🔍 [Integration] Buscando Artículos: ${JSON.stringify(codesToLookup)}`);
            try {
                const request = pool.request();
                // Usamos VarChar para máxima compatibilidad (SQL Server convierte automáticamente si la columna es INT)
                const clauses = codesToLookup.map((_, i) => `CodArticulo = @cod${i}`).join(' OR ');
                codesToLookup.forEach((c, i) => request.input(`cod${i}`, sql.VarChar(50), String(c).trim()));

                // Consulta explícita
                const artRes = await request.query(`SELECT IDProdReact, CodArticulo FROM Articulos WHERE ${clauses}`);

                console.log(`🔍 [Integration] Resultados DB Articulos encontrados: ${artRes.recordset.length}`);

                artRes.recordset.forEach(r => {
                    // Guardamos en el mapa. Usamos String para asegurar match con keys
                    mapArt[String(r.CodArticulo).trim()] = r.IDProdReact;
                });

            } catch (errLookup) {
                console.warn("⚠️ Error buscando IDProdReact:", errLookup.message);
                observacionesValidacion.push("Error DB buscando producto: " + errLookup.message);
                // No invalidamos toda la orden por esto, pero marcamos warning
            }
        }

        // Asignar y Validar Productos
        pendingOrderExecutions.forEach(exec => {
            if (exec.codArticulo) {
                const key = String(exec.codArticulo).trim();
                const foundId = mapArt[key];

                // Chequeo estricto de null/undefined (por si el ID es 0)
                if (foundId !== undefined && foundId !== null) {
                    exec.idProductoReact = foundId;
                    console.log(`✅ IDProductoReact asignado: ${foundId} para Art: ${exec.codArticulo}`);
                } else {
                    console.warn(`⚠️ IDProductoReact NO encontrado para CodArt ${exec.codArticulo}. (Buscado como: '${key}')`);
                    // Solo invalidamos si es CRÍTICO. El usuario indica que DEBERÍA estar.
                    // Si no está, lo dejamos pasar pero sin ID, o fallamos?
                    // Según el reclamo del usuario ("COMO ME VAS A DECIR QUE NO..."), prefiere que funcione si está.
                    // Si realmente no está en el mapa, es porque la query no lo trajo o IDProdReact es NULL.
                    esValido = false;
                    observacionesValidacion.push(`Producto Cod '${exec.codArticulo}' existe pero no tiene IDReact vinculado (o no se encontró).`);
                }
            }
        });

        // --- 6. TRANSACCIÓN DB ---
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const filesToUpload = [];
            const generatedOrders = [];
            const generatedIDs = [];

            // SOLO LA NOTA DEL CLIENTE (cleanedNote)
            let finalNote = cleanedNote || '';

            // Si validación falló, agregamos info en ValidacionOBS
            // Unir observaciones únicas
            const uniqueObs = [...new Set(observacionesValidacion)];
            const validacionObsStr = uniqueObs.length > 0 ? uniqueObs.join(' | ') : null;

            const sanitize = (str) => (str || '').replace(/[<>:"/\\|?*]/g, '_').trim();

            for (let idx = 0; idx < pendingOrderExecutions.length; idx++) {
                const exec = pendingOrderExecutions[idx];

                const globalIndex = idx + 1;
                let codigoParaEstaOrden;

                if (pendingOrderExecutions.length > 1) {
                    codigoParaEstaOrden = `${codigoOrdenFinal} (${globalIndex}/${pendingOrderExecutions.length})`;
                } else {
                    codigoParaEstaOrden = codigoOrdenFinal;
                }

                exec.codigoOrden = codigoParaEstaOrden;

                let proximoServicio = 'DEPOSITO';
                if (idx < pendingOrderExecutions.length - 1) proximoServicio = pendingOrderExecutions[idx + 1].areaID;

                const areaUM = mapaAreasUM[exec.areaID] || 'u';

                const parsedCodValid = codCliente ? parseInt(codCliente) : null;
                const safeCodCliente = isNaN(parsedCodValid) ? null : parsedCodValid;

                // Prevenir texto cayendo en IDs si por algun motivo llegaron sucios
                let safeIdClientReact = null;
                if (idClienteReact) {
                    // Si idClienteReact viene directo del query, lo pasamos a string o lo limpiamos
                    safeIdClientReact = idClienteReact.toString();
                }

                const resOrder = await new sql.Request(transaction)
                    .input('AreaID', sql.VarChar(20), exec.areaID || 'GENE')
                    .input('Cliente', sql.NVarChar(200), nombreCliente)
                    .input('CodCliente', sql.Int, safeCodCliente)
                    .input('IdClienteReact', sql.VarChar(50), safeIdClientReact)
                    .input('Desc', sql.NVarChar(300), jobName)
                    .input('Prio', sql.VarChar(20), urgency)
                    .input('Mat', sql.VarChar(255), exec.material)
                    .input('Var', sql.VarChar(100), exec.variante)
                    .input('Cod', sql.VarChar(50), exec.codigoOrden)
                    .input('ERP', sql.VarChar(50), erpDocNumber)
                    .input('Nota', sql.NVarChar(sql.MAX), finalNote)
                    .input('Mag', sql.VarChar(50), '0')
                    .input('Prox', sql.VarChar(50), proximoServicio)
                    .input('Estado', sql.VarChar(50), 'Pendiente')
                    .input('UM', sql.VarChar(20), areaUM)
                    .input('CArt', sql.VarChar(50), exec.codArticulo ? String(exec.codArticulo) : null)
                    .input('IdProdReact', sql.Int, !isNaN(parseInt(exec.idProductoReact)) ? parseInt(exec.idProductoReact) : null)
                    .input('Val', sql.Bit, esValido)
                    .input('ValObs', sql.NVarChar(sql.MAX), validacionObsStr)
                    .query(`
                        INSERT INTO Ordenes (
                            AreaID, Cliente, CodCliente, IdClienteReact, DescripcionTrabajo, Prioridad, 
                            FechaIngreso, FechaEntradaSector, FechaEstimadaEntrega, Material, Variante, 
                            CodigoOrden, NoDocERP, Nota, Magnitud, ProximoServicio, UM, Estado, EstadoenArea,
                            CodArticulo, IdProductoReact, Validacion, ValidacionOBS
                        )
                        OUTPUT INSERTED.OrdenID
                        VALUES (
                            @AreaID, @Cliente, @CodCliente, @IdClienteReact, @Desc, @Prio, 
                            GETDATE(), GETDATE(), DATEADD(day, 3, GETDATE()), @Mat, @Var, 
                            @Cod, @ERP, @Nota, @Mag, @Prox, @UM, @Estado, @Estado,
                            @CArt, @IdProdReact, @Val, @ValObs
                        )
                    `);

                const newOID = resOrder.recordset[0].OrdenID;
                generatedOrders.push(exec.codigoOrden);
                generatedIDs.push(newOID);

                let totalMagnitud = 0;
                let fileCount = 0;

                // --- NUEVO: CREAR LINEA DE SERVICIO EXTRA PARA FACTURACIÓN ---
                if (exec.isExtra) {
                    let qtyFact = 0;
                    if (exec.items && exec.items.length > 0) {
                        qtyFact = exec.items.reduce((sum, it) => sum + (parseInt(it.copies) || 1), 0);
                    }
                    if (qtyFact === 0) qtyFact = 1;

                    await new sql.Request(transaction)
                        .input('OID', sql.Int, newOID)
                        .input('Cod', sql.VarChar(50), exec.codArticulo || exec.areaID)
                        .input('Stk', sql.VarChar(50), exec.codStock || '')
                        .input('Des', sql.NVarChar(255), `${exec.variante} - ${exec.material}`)
                        .input('Cnt', sql.Decimal(18, 2), qtyFact)
                        .input('Obs', sql.NVarChar(sql.MAX), exec.notaAdicional || 'Generado desde Planilla')
                        .query(`
                            INSERT INTO ServiciosExtraOrden 
                            (OrdenID, CodArt, CodStock, Descripcion, Cantidad, PrecioUnitario, TotalLinea, Observacion, FechaRegistro) 
                            VALUES (@OID, @Cod, @Stk, @Des, @Cnt, 0, 0, @Obs, GETDATE())
                        `);
                }

                for (let i = 0; i < exec.items.length; i++) {
                    const item = exec.items[i];
                    const wM = parseFloat(item.width) || 0;
                    const hM = parseFloat(item.height) || 0;
                    const safeCopies = parseInt(item.copies) || 1; // Parse explicitly to avoid text values

                    let valMetros = 0;
                    if (areaUM.toLowerCase() === 'm2') valMetros = (wM * hM);
                    else if (areaUM.toLowerCase() === 'ml' || areaUM.toLowerCase() === 'm') valMetros = hM;
                    else valMetros = 1;

                    let ext = '.dat';
                    if (item.fileName && item.fileName.includes('.')) {
                        const parts = item.fileName.split('.');
                        if (!item.fileName.startsWith('http')) {
                            ext = `.${parts.pop()}`;
                        }
                    }

                    const finalName = `${exec.codigoOrden.replace(/\//g, '-')}_${sanitize(nombreCliente)}_${sanitize(jobName)}_Archivo ${i + 1} de ${exec.items.length} (x${safeCopies})${ext}`;

                    let obsFile = item.observaciones || '';
                    if (item.originalUrl && typeof item.originalUrl === 'string' && item.originalUrl.startsWith('http')) {
                        obsFile += ` [LINK: ${item.originalUrl}]`;
                    }

                    if (exec.isExtra) {
                        // SI ES EXTRA, ARCHIVO VA A REFERENCIA
                        await new sql.Request(transaction)
                            .input('OID', sql.Int, newOID)
                            .input('Tipo', sql.VarChar(50), 'BOCETO_EXTRA')
                            .input('Nom', sql.VarChar(200), finalName)
                            .input('Not', sql.NVarChar(sql.MAX), obsFile)
                            .input('Ubi', sql.NVarChar(sql.MAX), item.originalUrl)
                            .query(`
                                INSERT INTO ArchivosReferencia (
                                    OrdenID, TipoArchivo, NombreOriginal, NotasAdicionales, FechaSubida, UbicacionStorage
                                ) 
                                VALUES (
                                    @OID, @Tipo, @Nom, @Not, GETDATE(), @Ubi
                                )
                            `);

                        totalMagnitud += safeCopies;
                        fileCount++;
                    } else {
                        // SI ES PRINCIPAL, ARCHIVO VA A PRODUCCION
                        const resFile = await new sql.Request(transaction)
                            .input('OID', sql.Int, newOID)
                            .input('Nom', sql.VarChar(200), finalName)
                            .input('Tipo', sql.VarChar(50), 'Impresion')
                            .input('Cop', sql.Int, safeCopies)
                            .input('Met', sql.Decimal(10, 3), valMetros)
                            .input('Ancho', sql.Decimal(10, 2), wM)
                            .input('Alto', sql.Decimal(10, 2), hM)
                            .input('Obs', sql.NVarChar(sql.MAX), obsFile)
                            .input('Ruta', sql.NVarChar(sql.MAX), item.originalUrl)
                            .query(`
                                INSERT INTO ArchivosOrden (
                                    OrdenID, NombreArchivo, TipoArchivo, Copias, Metros, EstadoArchivo, FechaSubida, 
                                    Ancho, Alto, Observaciones, RutaAlmacenamiento
                                ) 
                                OUTPUT INSERTED.ArchivoID 
                                VALUES (
                                    @OID, @Nom, @Tipo, @Cop, @Met, 'Pendiente', GETDATE(), 
                                    @Ancho, @Alto, @Obs, @Ruta
                                )
                            `);

                        filesToUpload.push({ dbId: resFile.recordset[0].ArchivoID, originalName: item.fileName });

                        if (areaUM === 'u') totalMagnitud += safeCopies;
                        else totalMagnitud += (valMetros * safeCopies);
                        fileCount++;
                    }
                }

                if (fileCount > 0) {
                    await new sql.Request(transaction).input('OID', sql.Int, newOID).input('C', sql.Int, fileCount).input('Mag', sql.Decimal(10, 2), totalMagnitud).query("UPDATE Ordenes SET ArchivosCount = @C, Magnitud = CAST(@Mag AS VARCHAR) WHERE OrdenID = @OID");
                }
            }

            if (generatedOrders.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: "No se generaron órdenes. Verifica el formato del JSON." });
            }

            await transaction.commit();

            console.log("✅ [IntegrationOrder] Pedido creado:", generatedOrders);
            res.status(201).json({
                success: true,
                message: "Orden creada exitosamente (Integra V2)",
                orderId: generatedIDs[0],
                uuid: generatedOrders[0],
                subOrders: generatedOrders,
                filesToUpload
            });

        } catch (errTrx) {
            console.error("❌ SQL Transaction Error (Original Cause):", errTrx);
            try {
                await transaction.rollback();
            } catch (rbError) {
                console.warn("⚠️ Rollback failed (likely already aborted):", rbError.message);
            }
            throw errTrx; // Re-throw original error
        }

    } catch (err) {
        console.error("❌ IntegrationOrder Error:", err);
        res.status(500).json({ error: "Error al crear pedido de integración: " + err.message });
    }
};
