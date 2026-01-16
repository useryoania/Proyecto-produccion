const { getPool, sql } = require('../config/db');

// Helpers
const normalize = (s) => (s || '').toString().trim().toUpperCase();

function getNextStep(pipelineStr, currentStep) {
    if (!pipelineStr) return 'DEPOSITO';
    const steps = pipelineStr.split(/[\/-]/).map(s => s.trim().toUpperCase()).filter(Boolean);
    if (!currentStep) return steps[0];
    const curr = currentStep.toUpperCase();
    const idx = steps.findIndex(s => s === curr || s.includes(curr));
    if (idx >= 0 && idx < steps.length - 1) {
        return steps[idx + 1];
    }
    return 'DEPOSITO';
}

// ==========================================
// 1. LEGACY / BATCH LOGIC (Mantenida por compatibilidad)
// ==========================================

exports.validateBatch = async (req, res) => {
    const { codes, areaId, type } = req.body; // type: 'INGRESO' | 'EGRESO'
    const results = [];

    try {
        const pool = await getPool();

        for (const code of codes) {
            if (!code || !code.trim()) continue;
            const codNorm = normalize(code);
            let entity = null;

            // Identificar origen (Recepcion vs Orden)
            if (codNorm.startsWith('PRE')) {
                const r = await pool.request().input('C', sql.VarChar, codNorm)
                    .query("SELECT * FROM Recepciones WHERE Codigo = @C");
                entity = r.recordset[0];
            } else {
                const r = await pool.request().input('C', sql.VarChar, codNorm)
                    .query("SELECT * FROM Ordenes WHERE CodigoOrden = @C");
                entity = r.recordset[0];
            }

            const out = {
                orden: code,
                isValid: false,
                message: '',
                entity: entity ? {
                    Estado: entity.Estado,
                    Ubicacion: entity.UbicacionActual,
                    Proximo: entity.ProximoServicio
                } : null
            };

            if (!entity) {
                // Check if it exists in Logistica_Bultos (New System)
                const bultoCheck = await pool.request().input('C', sql.VarChar, codNorm)
                    .query("SELECT UbicacionActual, Estado FROM Logistica_Bultos WHERE CodigoEtiqueta = @C");

                if (bultoCheck.recordset.length > 0) {
                    const b = bultoCheck.recordset[0];
                    out.entity = { Ubicacion: b.UbicacionActual, Estado: b.Estado };
                    // Apply generic logic regarding location
                    if (type === 'INGRESO') {
                        if (normalize(b.UbicacionActual) === normalize(areaId)) {
                            out.message = 'Ya está en el área';
                            out.isValid = true;
                        } else {
                            out.message = `Viene de ${b.UbicacionActual}`;
                            out.isValid = true;
                        }
                    } else {
                        // EGRESO
                        if (normalize(b.UbicacionActual) !== normalize(areaId)) {
                            out.message = `No está en esta área (${b.UbicacionActual})`;
                            out.isValid = false;
                        } else {
                            out.message = 'Listo para despachar';
                            out.isValid = true;
                        }
                    }
                } else {
                    // Not found anywhere
                    if (type === 'INGRESO') {
                        out.isValid = true;
                        out.message = 'Nuevo Ingreso (No registrado)';
                        out.isNew = true;
                    } else {
                        out.isValid = false;
                        out.message = 'No existe en base de datos';
                    }
                }
            } else {
                // Legacy Logic for Orders/Recepciones
                const ubicacion = normalize(entity.UbicacionActual);
                const estado = normalize(entity.Estado);
                const area = normalize(areaId);

                if (type === 'INGRESO') {
                    if (ubicacion === area && estado !== 'EN TRANSITO') {
                        out.isValid = true;
                        out.message = 'Ya está en el área ' + estado;
                    } else if (estado === 'EN TRANSITO') {
                        out.isValid = true;
                        out.message = 'Listo para recibir';
                    } else {
                        out.isValid = true;
                        out.message = `Viene de ${ubicacion} (${estado})`;
                    }
                } else { // EGRESO
                    if (ubicacion !== area && estado !== 'INGRESO' && estado !== 'EN PROCESO' && estado !== 'RECEPCIONADO') {
                        out.isValid = false;
                        out.message = `No está en esta área (Está en ${ubicacion})`;
                    } else if (estado === 'EN TRANSITO') {
                        out.isValid = false;
                        out.message = 'Ya fue despachado (En Transito)';
                    } else {
                        out.isValid = true;
                        const pipeline = entity.Detalle || entity.Servicios || '';
                        out.nextService = getNextStep(pipeline, area);
                        out.message = 'Listo para despachar -> ' + out.nextService;
                    }
                }
            }
            results.push(out);
        }
        res.json({ results });
    } catch (err) {
        console.error("Error validateBatch:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.processBatch = async (req, res) => {
    const { movements, areaId, type, usuarioId } = req.body;
    const processed = [];

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const mov of movements) {
                const codNorm = normalize(mov.orden);
                let isRecepcion = codNorm.startsWith('PRE');

                // Update Legacy Tables
                let nuevoEstado = (type === 'INGRESO') ? 'EN PROCESO' : 'EN TRANSITO';
                let nuevaUbicacion = areaId;

                // ALSO Update Logistica_Bultos if exists
                await new sql.Request(transaction)
                    .input('Est', sql.VarChar, (type === 'INGRESO') ? 'EN_STOCK' : 'EN_TRANSITO')
                    .input('Ubi', sql.VarChar, areaId)
                    .input('Cod', sql.VarChar, codNorm)
                    .query(`UPDATE Logistica_Bultos SET Estado = @Est, UbicacionActual = @Ubi WHERE CodigoEtiqueta = @Cod`);

                // Update Ordenes/Recepciones
                const qryUpdate = isRecepcion
                    ? `UPDATE Recepciones SET Estado = @Est, UbicacionActual = @Ubi WHERE Codigo = @Cod`
                    : `UPDATE Ordenes SET Estado = @Est, UbicacionActual = @Ubi WHERE CodigoOrden = @Cod`;

                await new sql.Request(transaction)
                    .input('Est', sql.VarChar, nuevoEstado)
                    .input('Ubi', sql.VarChar, nuevaUbicacion)
                    .input('Cod', sql.VarChar, codNorm)
                    .query(qryUpdate);

                // Log Legacy
                await new sql.Request(transaction)
                    .input('Cod', sql.VarChar, codNorm)
                    .input('Tipo', sql.VarChar, type)
                    .input('Area', sql.VarChar, areaId)
                    .input('UID', sql.Int, usuarioId)
                    .input('Obs', sql.NVarChar, mov.observaciones || '')
                    .query(`INSERT INTO MovimientosLogistica (CodigoBulto, TipoMovimiento, AreaID, UsuarioID, Observaciones) VALUES (@Cod, @Tipo, @Area, @UID, @Obs)`);

                processed.push({ orden: codNorm, estado: nuevoEstado });
            }

            await transaction.commit();
            res.json({ success: true, processed });

        } catch (inner) {
            await transaction.rollback();
            throw inner;
        }
    } catch (err) {
        console.error("Error processBatch:", err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 2. NEW WMS LOGIC (BULTOS & REMITOS)
// ==========================================

// --- BULTOS ---

exports.createBulto = async (req, res) => {
    const { codigoEtiqueta, tipo, ordenId, descripcion, ubicacion, usuarioId } = req.body;
    try {
        const pool = await getPool();
        // Insert or Update (upsert logic simple)
        const check = await pool.request().input('C', sql.VarChar, codigoEtiqueta).query("SELECT BultoID FROM Logistica_Bultos WHERE CodigoEtiqueta = @C");

        if (check.recordset.length > 0) {
            return res.json({ success: true, message: 'Bulto ya existía en sistema WMS', id: check.recordset[0].BultoID });
        }

        const r = await pool.request()
            .input('Cod', sql.VarChar, codigoEtiqueta)
            .input('Tip', sql.VarChar, tipo || 'PROD_TERMINADO')
            .input('OID', sql.Int, ordenId || null)
            .input('Desc', sql.NVarChar, descripcion || '')
            .input('Ubi', sql.NVarChar, ubicacion || 'PRODUCCION')
            .input('UID', sql.Int, usuarioId || 1)
            .query(`
                INSERT INTO Logistica_Bultos (CodigoEtiqueta, Tipocontenido, OrdenID, Descripcion, UbicacionActual, Estado, UsuarioCreador)
                OUTPUT INSERTED.BultoID
                VALUES (@Cod, @Tip, @OID, @Desc, @Ubi, 'EN_STOCK', @UID)
            `);

        res.json({ success: true, id: r.recordset[0].BultoID });
    } catch (err) {
        console.error("Error createBulto:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getBultoByLabel = async (req, res) => {
    const { label } = req.params;
    try {
        const pool = await getPool();
        const r = await pool.request().input('L', sql.VarChar, label)
            .query("SELECT * FROM Logistica_Bultos WHERE CodigoEtiqueta = @L");

        if (r.recordset.length === 0) return res.status(404).json({ error: 'Bulto no encontrado' });
        res.json(r.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- REMITOS (DISPATCH) ---

exports.createRemito = async (req, res) => {
    const { areaOrigen, areaDestino, usuarioId, bultosIds, observations } = req.body;

    // Generar codigo remito
    const codigoRemito = `REM-${Date.now().toString().slice(-6)}`;

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Crear Cabecera
            const headRes = await new sql.Request(transaction)
                .input('Code', sql.VarChar, codigoRemito)
                .input('Orig', sql.VarChar, areaOrigen)
                .input('Dest', sql.VarChar, areaDestino)
                .input('User', sql.Int, usuarioId)
                .input('Obs', sql.NVarChar, observations)
                .query(`
                    INSERT INTO Logistica_Envios 
                    (CodigoRemito, AreaOrigenID, AreaDestinoID, UsuarioEmisor, FechaSalida, Estado, Observaciones)
                    OUTPUT INSERTED.EnvioID
                    VALUES (@Code, @Orig, @Dest, @User, GETDATE(), 'EN_TRANSITO', @Obs)
                `);
            const envioId = headRes.recordset[0].EnvioID;

            // 2. Insertar Items y Actualizar Bultos
            for (const bid of bultosIds) {
                // Link
                await new sql.Request(transaction)
                    .input('EID', sql.Int, envioId)
                    .input('BID', sql.Int, bid)
                    .query(`INSERT INTO Logistica_EnvioItems (EnvioID, BultoID, EstadoRecepcion) VALUES (@EID, @BID, 'PENDIENTE')`);

                // Update Bulto Status
                await new sql.Request(transaction)
                    .input('BID', sql.Int, bid)
                    .query(`UPDATE Logistica_Bultos SET Estado = 'EN_TRANSITO', UbicacionActual = 'TRANSITO' WHERE BultoID = @BID`);
            }

            await transaction.commit();
            res.json({ success: true, dispatchCode: codigoRemito, envioId });

        } catch (inner) {
            await transaction.rollback();
            throw inner;
        }
    } catch (err) {
        console.error("Error createRemito:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.validateDispatch = async (req, res) => {
    const { bultosIds } = req.body; // Array of IDs
    // Check status
    try {
        const pool = await getPool();
        // Podriamos chequear si estan disponibles
        const r = await pool.request().query(`SELECT BultoID, Estado, UbicacionActual FROM Logistica_Bultos WHERE BultoID IN (${bultosIds.join(',')})`);
        res.json({ valid: true, details: r.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRemitoByCode = async (req, res) => {
    const { code } = req.params;
    try {
        const pool = await getPool();
        // Cabecera
        const head = await pool.request().input('C', sql.VarChar, code)
            .query("SELECT * FROM Logistica_Envios WHERE CodigoRemito = @C");

        if (head.recordset.length === 0) return res.status(404).json({ error: 'Remito no encontrado' });
        const envio = head.recordset[0];

        // Items + Bulto Info + Orden Info
        const items = await pool.request().input('EID', sql.Int, envio.EnvioID)
            .query(`
                SELECT i.*, b.CodigoEtiqueta, b.Descripcion, b.OrdenID, o.Cliente, o.DescripcionTrabajo
                FROM Logistica_EnvioItems i
                INNER JOIN Logistica_Bultos b ON i.BultoID = b.BultoID
                LEFT JOIN Ordenes o ON b.OrdenID = o.OrdenID
                WHERE i.EnvioID = @EID
            `);

        res.json({ ...envio, items: items.recordset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- RECEPCION DE DESPACHOS ---

exports.receiveDispatch = async (req, res) => {
    const { envioId, itemsRecibidos, usuarioId, areaReceptora } = req.body;
    // itemsRecibidos: [{ bultoId, estado: 'ESCANEADO' | 'FALTANTE' }]

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            let receivedCount = 0;

            for (const item of itemsRecibidos) {
                // Update Item
                await new sql.Request(transaction)
                    .input('Est', sql.VarChar, item.estado)
                    .input('EID', sql.Int, envioId)
                    .input('BID', sql.Int, item.bultoId)
                    .query(`UPDATE Logistica_EnvioItems SET EstadoRecepcion = @Est, FechaEscaneo = GETDATE() WHERE EnvioID = @EID AND BultoID = @BID`);

                // Update Bulto Location if scanned
                if (item.estado === 'ESCANEADO') {
                    await new sql.Request(transaction)
                        .input('Ubi', sql.VarChar, areaReceptora)
                        .input('BID', sql.Int, item.bultoId)
                        .query(`UPDATE Logistica_Bultos SET Estado = 'EN_STOCK', UbicacionActual = @Ubi WHERE BultoID = @BID`);

                    receivedCount++;

                    // FUSION: Update Orden location as well if possible (optional, to keep sync)
                    // We'd need to know if ALL bultos of the order moved, but for now we can update 'UbicacionActual' of the order to the new area roughly.
                }
            }

            // Check if full reception
            const check = await new sql.Request(transaction).input('EID', sql.Int, envioId)
                .query("SELECT COUNT(*) as Total, SUM(CASE WHEN EstadoRecepcion != 'PENDIENTE' THEN 1 ELSE 0 END) as Processed FROM Logistica_EnvioItems WHERE EnvioID = @EID");

            const { Total, Processed } = check.recordset[0];
            const newStatus = (Processed >= Total) ? 'RECIBIDO_TOTAL' : 'RECIBIDO_PARCIAL';

            await new sql.Request(transaction)
                .input('Est', sql.VarChar, newStatus)
                .input('UID', sql.Int, usuarioId)
                .input('EID', sql.Int, envioId)
                .query(`UPDATE Logistica_Envios SET Estado = @Est, UsuarioReceptor = @UID, FechaLlegada = GETDATE() WHERE EnvioID = @EID`);

            await transaction.commit();
            res.json({ success: true, status: newStatus });

        } catch (inner) {
            await transaction.rollback();
            throw inner;
        }
    } catch (err) {
        console.error("Error receiveDispatch:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDashboard = async (req, res) => {
    const { areaId } = req.query;
    try {
        const pool = await getPool();

        // 1. Stock en Area (Bultos)
        const stockQ = await pool.request().input('A', sql.VarChar, areaId)
            .query(`
                SELECT COUNT(*) as TotalBultos, COUNT(DISTINCT OrdenID) as TotalOrdenes 
                FROM Logistica_Bultos 
                WHERE UbicacionActual = @A AND Estado = 'EN_STOCK'
            `);

        // 2. En Transito HACIA mi (Enviados con Destino = AreaId y Estado != RECIBIDO_TOTAL)
        const incomingQ = await pool.request().input('A', sql.VarChar, areaId)
            .query(`
                SELECT COUNT(*) as IncomingRemitos
                FROM Logistica_Envios
                WHERE AreaDestinoID = @A AND Estado IN ('EN_TRANSITO', 'RECIBIDO_PARCIAL')
            `);

        res.json({
            stock: stockQ.recordset[0],
            incoming: incomingQ.recordset[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getHistory = async (req, res) => {
    // Implementation similar to legacy but querying Logistica_Bultos or MovimientosLogistica
    // Keeping it simple for now
    const { areaId } = req.query;
    try {
        const pool = await getPool();
        const r = await pool.request().input('A', sql.VarChar, areaId)
            .query("SELECT TOP 50 * FROM MovimientosLogistica WHERE AreaID = @A ORDER BY FechaMovimiento DESC");
        res.json(r.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
