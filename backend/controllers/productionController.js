const { getPool, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// --- HELPERS CONSTANTS ---
const pointsToCm = (points) => (points / 72) * 2.54;
const pixelsToCm = (pixels, dpi) => (pixels / dpi) * 2.54;
const cmToM = (cm) => cm / 100;

// Extraer ID de Drive
const getDriveId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:id=|\/d\/)([\w-]+)/);
    return match ? match[1] : null;
};

// ==========================================
// 1. TABLERO KANBAN (ASIGNACIÓN)
// ==========================================
exports.getProductionBoard = async (req, res) => {
    const { area } = req.query;
    try {
        const pool = await getPool();
        const machines = await pool.request().input('Area', sql.VarChar, area)
            .query("SELECT EquipoID as id, Nombre as name, EstadoProceso as status FROM dbo.ConfigEquipos WHERE AreaID = @Area AND Activo = 1");

        const rolls = await pool.request().input('Area', sql.VarChar, area)
            .query(`SELECT R.*, R.RolloID as id, R.Codigo as rollCode, 
                   (SELECT COUNT(*) FROM dbo.Ordenes WHERE RolloID = R.RolloID) as ordersCount
                   FROM dbo.Rollos R WHERE R.AreaID = @Area AND R.Estado NOT IN ('Cerrado', 'Finalizado')`);

        res.json({
            machines: machines.recordset.map(m => ({
                ...m,
                rolls: rolls.recordset.filter(r => String(r.MaquinaID) === String(m.id))
            })),
            pendingRolls: rolls.recordset.filter(r => !r.MaquinaID)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 2. CONTROL DE TIEMPOS (PLAY/PAUSE)
// ==========================================
const { registrarAuditoria, registrarHistorialOrden } = require('../services/trackingService');

exports.toggleRollStatus = async (req, res) => {
    const { rollId, action } = req.body;
    const userId = req.user ? req.user.id : (req.body.userId || 1);
    const ip = req.ip || req.connection.remoteAddress;

    console.log(`[toggleRollStatus] RollID: ${rollId}, Action: ${action}`);

    let transaction;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Obtener informacin actual del Rollo y su Maquina
        const rollInfo = await request.input('RID_GET', sql.Int, rollId)
            .query(`SELECT r.MaquinaID, c.EstadoProceso 
                    FROM dbo.Rollos r
                    LEFT JOIN dbo.ConfigEquipos c ON r.MaquinaID = c.EquipoID
                    WHERE r.RolloID = @RID_GET`);

        let machineStatus = 'En Procesamiento';
        if (rollInfo.recordset.length > 0 && rollInfo.recordset[0].EstadoProceso) {
            machineStatus = rollInfo.recordset[0].EstadoProceso;
        }

        if (action === 'start') {
            // === START ===
            // Roll: Estado -> 'En maquina', FechaInicioProduccion -> Now
            // Orders: Estado -> 'Produccion', EstadoenArea -> MachineStatus
            await new sql.Request(transaction).input('RID', sql.Int, rollId).input('StArea', sql.VarChar, machineStatus)
                .query(`UPDATE dbo.Rollos 
                        SET Estado = 'En maquina', 
                            FechaInicioProduccion = GETDATE() 
                        WHERE RolloID = @RID`);

            // Fix BitacoraID NULL error: Generate ID manually
            const resID = await new sql.Request(transaction).query("SELECT ISNULL(MAX(BitacoraID), 0) + 1 as NewID FROM dbo.BitacoraProduccion");
            const newBitacoraID = resID.recordset[0].NewID;

            await new sql.Request(transaction)
                .input('BID', sql.Int, newBitacoraID)
                .input('RID', sql.Int, rollId)
                .query("INSERT INTO dbo.BitacoraProduccion (BitacoraID, RolloID, FechaInicio) VALUES (@BID, @RID, GETDATE())");

            await new sql.Request(transaction).input('RID', sql.Int, rollId).input('StArea', sql.VarChar, machineStatus)
                .query("UPDATE dbo.Ordenes SET Estado = 'Produccion', EstadoenArea = @StArea WHERE RolloID = @RID");

            // Log History
            await registerHistoryForOrders(transaction, rollId, machineStatus, userId, 'Inicio Produccion');
            await registrarAuditoria(transaction, userId, 'INICIO_PRODUCCION', `Rollo ${rollId} iniciado`, ip);

        } else if (action === 'pause') {
            // === PAUSE ===
            await new sql.Request(transaction).input('RID', sql.Int, rollId)
                .query(`UPDATE dbo.Rollos 
                        SET Estado = 'Pausado', 
                            FechaInicioProduccion = NULL 
                        WHERE RolloID = @RID`);

            await new sql.Request(transaction).input('RID', sql.Int, rollId)
                .query("UPDATE dbo.BitacoraProduccion SET FechaFin = GETDATE() WHERE RolloID = @RID AND FechaFin IS NULL");

            await new sql.Request(transaction).input('RID', sql.Int, rollId)
                .query("UPDATE dbo.Ordenes SET Estado = 'Produccion', EstadoenArea = 'Pausado' WHERE RolloID = @RID");

            // Log History
            await registerHistoryForOrders(transaction, rollId, 'Pausado', userId, 'Produccion Pausada');
            await registrarAuditoria(transaction, userId, 'PAUSA_PRODUCCION', `Rollo ${rollId} pausado`, ip);

        } else if (action === 'finish') {
            // === FINISH ===
            const { destination } = req.body; // 'quality' (default) or 'production'

            if (destination === 'production') {
                // Opción A: MANTENER EN PRODUCCIÓN (Liberar de máquina pero dejar abierto/cola)
                // Rollo: Estado -> 'Abierto', Sin Maquina
                await new sql.Request(transaction).input('RID', sql.Int, rollId)
                    .query(`UPDATE dbo.Rollos 
                            SET Estado = 'Abierto',
                                MaquinaID = NULL 
                            WHERE RolloID = @RID`);

                // Bitácora: Cierra ciclo de máquina actual
                await new sql.Request(transaction).input('RID', sql.Int, rollId)
                    .query("UPDATE dbo.BitacoraProduccion SET FechaFin = GETDATE() WHERE RolloID = @RID AND FechaFin IS NULL");

                // Ordenes: Se mantienen en 'Produccion' y 'En Lote', liberamos MaquinaID
                await new sql.Request(transaction).input('RID', sql.Int, rollId)
                    .query(`UPDATE dbo.Ordenes 
                            SET Estado = 'Produccion', 
                                EstadoenArea = 'En Lote',
                                MaquinaID = NULL
                            WHERE RolloID = @RID`);

                // Log
                await registerHistoryForOrders(transaction, rollId, 'En Lote', userId, 'Fin Proceso Maquina - Mantenido en Produccion');
                await registrarAuditoria(transaction, userId, 'FIN_MAQUINA_PROD', `Rollo ${rollId} liberado de maq (sigue en prod)`, ip);

            } else {
                // Opción B: FINALIZAR COMPLETAMENTE (ENVIAR A CALIDAD) - Default
                // Rollo: Estado -> 'Finalizado' (Cerrado)
                await new sql.Request(transaction).input('RID', sql.Int, rollId)
                    .query(`UPDATE dbo.Rollos 
                            SET Estado = 'Finalizado',
                                MaquinaID = NULL
                            WHERE RolloID = @RID`);

                await new sql.Request(transaction).input('RID', sql.Int, rollId)
                    .query("UPDATE dbo.BitacoraProduccion SET FechaFin = GETDATE() WHERE RolloID = @RID AND FechaFin IS NULL");

                // Actualizar Ordenes
                // Estado Global: 'Produccion' (Sigue en planta)
                // Estado Area: 'Control y Calidad' (Siguiente paso)
                await new sql.Request(transaction).input('RID', sql.Int, rollId)
                    .query(`UPDATE dbo.Ordenes 
                            SET Estado = 'Produccion', 
                                EstadoenArea = 'Control y Calidad', 
                                MaquinaID = NULL
                            WHERE RolloID = @RID`);

                // Log History for Orders (State change)
                await registerHistoryForOrders(transaction, rollId, 'Control y Calidad', userId, 'Fin Produccion - Enviado a Control');
                await registrarAuditoria(transaction, userId, 'FIN_PRODUCCION', `Rollo ${rollId} finalizado`, ip);
            }
        }

        await transaction.commit();
        res.json({ success: true });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error toggleRollStatus:", err);
        res.status(500).json({ error: err.message });
    }
};

// Helper inside closure or file scope to avoid code duplication
async function registerHistoryForOrders(transaction, rollId, estado, userId, detalle) {
    const req = new sql.Request(transaction);
    const res = await req.input('RID_H', sql.Int, rollId).query("SELECT OrdenID FROM dbo.Ordenes WHERE RolloID = @RID_H");
    for (const o of res.recordset) {
        await registrarHistorialOrden(transaction, o.OrdenID, estado, userId, detalle);
    }
}

// ==========================================
// 3. CONTROL DE CALIDAD / ARCHIVOS
// ==========================================
exports.getRollAndFiles = async (req, res) => {
    const { area } = req.query;
    try {
        const pool = await getPool();
        const result = await pool.request().input('Area', sql.VarChar, area).query(`
            SELECT R.Nombre as RollName, O.Cliente, A.* FROM dbo.ArchivosOrden A
            JOIN dbo.Ordenes O ON A.OrdenID = O.OrdenID
            JOIN dbo.Rollos R ON O.RolloID = R.RolloID
            WHERE R.AreaID = @Area AND R.Estado = 'En maquina'
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.registerFileAction = async (req, res) => {
    const { fileId, action } = req.body;
    try {
        const pool = await getPool();
        await pool.request().input('ID', sql.Int, fileId).input('Status', sql.VarChar, action)
            .query("UPDATE dbo.ArchivosOrden SET Estado = @Status WHERE ArchivoID = @ID");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ==========================================
// 4. FUNCIONES DE APOYO (ASIGNACIÓN Y TABLA)
// ==========================================
exports.assignRoll = async (req, res) => {
    const { rollId, machineId } = req.body;
    console.log(`[assignRoll] Request received. RollID: ${rollId}, MachineID: ${machineId}`);

    let transaction;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Estado inicial al asignar: 'En Cola'
        const machineStatus = 'En Cola';

        const mid = machineId || null;

        // 2. Actualizar Rollo
        console.log(`[assignRoll] Updating Roll ${rollId} with MaquinaID=${mid}, EstadoEnArea=${machineStatus}...`);
        // Parse RID safely
        let finalRollId = rollId;
        if (!isNaN(parseInt(rollId))) finalRollId = parseInt(rollId);

        const reqRoll = new sql.Request(transaction);
        // Use VarChar for RID to be safe for both String and Int IDs
        // SQL Server will implicit cast if column is Int.
        const rollRes = await reqRoll.input('RID', sql.VarChar(20), finalRollId)
            .input('MID', sql.Int, mid)
            .input('StatusArea', sql.VarChar, machineStatus)
            .query(`UPDATE dbo.Rollos 
                             SET MaquinaID = @MID
                             WHERE RolloID = @RID`);
        console.log(`[assignRoll] Roll updated. Rows affected: ${rollRes.rowsAffected}`);

        // 3. Actualizar Ordenes asociadas al Rollo
        console.log(`[assignRoll] Updating Orders for Roll ${rollId} with MaquinaID=${mid}, EstadoenArea=${machineStatus}...`);
        const reqOrders = new sql.Request(transaction);
        const orderRes = await reqOrders.input('MID', sql.Int, mid)
            .input('StatusArea', sql.VarChar, machineStatus)
            .input('RID', sql.Int, rollId)
            .query(`UPDATE dbo.Ordenes 
                               SET MaquinaID = @MID, 
                                   Estado = 'Produccion',
                                   EstadoenArea = @StatusArea 
                               WHERE RolloID = @RID`);

        console.log(`[assignRoll] Orders updated. Rows affected: ${orderRes.rowsAffected}`);

        await transaction.commit();
        console.log(`[assignRoll] Transaction committed successfully.`);
        res.json({ success: true, machineStatus });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error en assignRoll:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.unassignRoll = async (req, res) => {
    const { rollId } = req.body;
    console.log(`[unassignRoll] Request received. RollID: ${rollId}`);
    let transaction;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Desmontar Rollo
        console.log(`[unassignRoll] Unmounting Roll ${rollId}...`);
        const rollRes = await request.input('RID', sql.Int, rollId)
            .query(`UPDATE dbo.Rollos 
                    SET MaquinaID = NULL, 
                    Estado = 'Abierto' 
                    WHERE RolloID = @RID`);
        console.log(`[unassignRoll] Roll updated. Rows affected: ${rollRes.rowsAffected}`);

        // 2. Limpiar MaquinaID de Ordenes y Restaurar Estado
        console.log(`[unassignRoll] Clearing MachineID from Orders for Roll ${rollId}...`);
        const reqOrders = new sql.Request(transaction);
        const orderRes = await reqOrders.input('RID', sql.Int, rollId)
            .query(`UPDATE dbo.Ordenes 
                                     SET MaquinaID = NULL,
                                         Estado = 'Produccion',
                                         EstadoenArea = 'En Lote'
                                     WHERE RolloID = @RID`);
        console.log(`[unassignRoll] Orders updated. Rows affected: ${orderRes.rowsAffected}`);

        await transaction.commit();
        console.log(`[unassignRoll] Transaction committed successfully.`);
        res.json({ success: true });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Error en unassignRoll:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderDetails = async (req, res) => {
    const { orderId } = req.query;
    console.log(`[productionController] Obteniendo detalles para OrderID: ${orderId}`);
    try {
        const pool = await getPool();
        // Frontend fetch expects direct array of files
        // Fetch files for the given orderId
        const files = await pool.request()
            .input('ID', sql.Int, orderId)
            .query("SELECT * FROM dbo.ArchivosOrden WHERE OrdenID = @ID");

        console.log(`[productionController] Archivos encontrados: ${files.recordset.length}`);

        // Return only the files array
        res.json(files.recordset);
    } catch (err) {
        console.error(`[productionController] Error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Stubs para evitar errores de Undefined en el Router
exports.getBoardData = async (req, res) => { res.json([]); };
exports.moveOrder = async (req, res) => { res.json({ success: true }); };
exports.createRoll = async (req, res) => { res.json({ success: true }); };
exports.reorderOrders = async (req, res) => { res.json({ success: true }); };
exports.updateRollName = async (req, res) => { res.json({ success: true }); };
exports.getMachines = async (req, res) => { res.json([]); };

// ==========================================
// 5. MAGIC SORT (Armado Automático)
// ==========================================
exports.magicSort = async (req, res) => {
    const { areaCode, selectedIds } = req.body;
    const userId = req.user ? req.user.id : (req.body.userId || 1);
    const ip = req.ip || req.connection.remoteAddress;

    // Normalize Area Code
    let targetArea = areaCode;
    // if (areaCode === 'DF') targetArea = 'DTF'; 

    if (!['ECOUV', 'DTF', 'DF'].includes(targetArea)) {
        return res.status(400).json({ error: 'La lógica mágica solo está definida para ECOUV, DTF y DF por el momento.' });
    }

    if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos una orden para utilizar Magic Sort.' });
    }

    try {
        const pool = await getPool();

        console.log("--- INICIANDO SECUENCIA MAGIC SORT (ECOUV) ---");

        // ---------------------------------------------------------
        // PASO 1: BUSCAR Y CLASIFICAR (EN MEMORIA)
        // ---------------------------------------------------------
        console.log("-> Paso 1: Buscando órdenes pendientes seleccionadas...");

        // Sanitize IDs: Ensure they are numbers
        const safeIds = selectedIds.map(id => Number(id)).filter(n => !isNaN(n));
        if (safeIds.length === 0) return res.status(400).json({ error: 'IDs inválidos.' });

        const pendingRes = await pool.request().input('Area', sql.VarChar, targetArea)
            .query(`
                SELECT OrdenID, CodigoOrden, Variante, Tinta, Prioridad, Magnitud, Material, Cliente, DescripcionTrabajo 
                FROM dbo.Ordenes 
                WHERE AreaID = @Area 
                AND Estado = 'Pendiente' 
                AND RolloID IS NULL 
                AND OrdenID IN (${safeIds.join(',')})
            `);

        const allPending = pendingRes.recordset;
        console.log(`   Encontradas: ${allPending.length} órdenes seleccionadas.`);

        if (allPending.length === 0) {
            return res.json({ success: true, message: 'No hay órdenes pendientes seleccionadas válidas para agrupar.' });
        }

        // Helper Prioridad: Falla(4) > Urgente(3) > Reposicion(2) > Normal(1)
        const priorityScore = (p) => {
            const s = (p || '').toLowerCase();
            if (s.includes('falla')) return 4;
            if (s.includes('urgente')) return 3;
            if (s.includes('reposici')) return 2;
            return 1;
        };
        const sortFn = (a, b) => priorityScore(b.Prioridad) - priorityScore(a.Prioridad);

        const groups = { terminaciones: [], uv: [], ecosolvente: [] };
        const processedIds = new Set();

        // 2.1 Terminaciones
        groups.terminaciones = allPending.filter(o => {
            const v = (o.Variante || '').toLowerCase();
            return v.includes('materiales extra gran formato');
        }).sort(sortFn);
        groups.terminaciones.forEach(o => processedIds.add(o.OrdenID));

        // 2.2 UV
        groups.uv = allPending.filter(o => {
            if (processedIds.has(o.OrdenID)) return false;
            return (o.Tinta || '').toUpperCase() === 'UV';
        }).sort(sortFn);
        groups.uv.forEach(o => processedIds.add(o.OrdenID));

        // 2.3 Ecosolvente
        groups.ecosolvente = allPending.filter(o => {
            if (processedIds.has(o.OrdenID)) return false;
            const t = (o.Tinta || '').toLowerCase();
            const m = (o.Material || '').toLowerCase();
            return t.includes('ecosolvente') || m.includes('lona frontlight');
        }).sort(sortFn);

        // ---------------------------------------------------------
        // PASO 2: CREAR ROLLOS Y ASIGNAR (PRIORIDAD: ORDENAMIENTO)
        // ---------------------------------------------------------
        // Helper Agrupador por Material
        const groupByMaterial = (orders) => {
            const grouped = {};
            orders.forEach(o => {
                const mat = (o.Material || 'GENERICO').toUpperCase().trim();
                if (!grouped[mat]) grouped[mat] = [];
                grouped[mat].push(o);
            });
            return grouped;
        };

        let transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Helper (Scope interno de Transacción)
            const processGroupDB = async (orders, config, materialName) => {
                if (!orders || orders.length === 0) return 0;
                const { namePrefix, machineKeyword } = config;

                // A. Buscar Maquina
                const mRes = await new sql.Request(transaction).query(`SELECT TOP 1 EquipoID, Nombre, EstadoProceso FROM dbo.ConfigEquipos WHERE AreaID = 'ECOUV' AND Nombre LIKE '%${machineKeyword}%'`);
                const machine = mRes.recordset[0];
                const machineId = machine ? machine.EquipoID : null;
                // Estado inicial al asignar magicamente: 'En Cola'
                let machineStatus = 'En Cola';

                // --- INVENTARIO: ASIGNACIÓN AUTOMÁTICA DE BOBINA ---
                let assignedBobinaId = null;
                let assignedMetros = 0;

                try {
                    // 1. Calcular metros requeridos (Estimado)
                    const totalMeters = orders.reduce((acc, o) => {
                        const val = parseFloat((o.Magnitud || '0').replace(/[^\d.]/g, '')) || 0;
                        return acc + val;
                    }, 0);

                    // 2. Buscar Insumo compatible
                    // Intentamos match exacto o parcial con el nombre del material de la orden
                    const insumoRes = await new sql.Request(transaction)
                        .input('MatName', sql.NVarChar, `%${materialName.trim()}%`)
                        .query("SELECT TOP 1 InsumoID FROM Insumos WHERE Nombre LIKE @MatName OR CodigoReferencia LIKE @MatName OR Categoria LIKE @MatName");

                    if (insumoRes.recordset.length > 0) {
                        const insumoId = insumoRes.recordset[0].InsumoID;

                        // 3. Buscar Bobina FIFO
                        // Prioriza: 1. CAPACIDAD SUFICIENTE (REQUISITO DURO). 2. La más vieja (FIFO). 3. Estado (Disponible o En Uso)
                        const bobinaRes = await new sql.Request(transaction)
                            .input('IID', sql.Int, insumoId)
                            .input('Area', sql.VarChar, targetArea)
                            .query(`
                                SELECT TOP 1 BobinaID, MetrosRestantes 
                                FROM InventarioBobinas 
                                WHERE InsumoID = @IID 
                                AND (Estado = 'Disponible' OR Estado = 'En Uso') -- Se permite reutilizar si hay capacidad
                                AND MetrosRestantes >= ${totalMeters} -- Requisito de capacidad estricto
                                AND (AreaID = @Area OR AreaID IS NULL)
                                ORDER BY 
                                    FechaIngreso ASC -- FIFO puro entre las válidas
                            `);

                        if (bobinaRes.recordset.length > 0) {
                            assignedBobinaId = bobinaRes.recordset[0].BobinaID;
                            assignedMetros = bobinaRes.recordset[0].MetrosRestantes;

                            // Actualizar Estado Bobina -> En Uso
                            await new sql.Request(transaction)
                                .input('BID', sql.Int, assignedBobinaId)
                                .query("UPDATE InventarioBobinas SET Estado = 'En Uso' WHERE BobinaID = @BID");

                            console.log(`[MagicSort] Bobina asignada: ${assignedBobinaId} (${assignedMetros}m) para Rollo de ${totalMeters}m`);
                        }
                    }
                } catch (e) {
                    console.warn("[MagicSort] Error intentando asignar bobina automatica:", e.message);
                    // No bloqueamos el flujo, seguimos sin bobina
                }
                // ---------------------------------------------------

                // B. Generar Identificadores
                const displayId = Math.floor(Math.random() * 1000);
                // Truncar material para que entre en el nombre
                const cleanMat = (materialName || '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 20);
                const rollName = `Auto ${namePrefix} (${cleanMat}) ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} - ID:${displayId}`;

                // C. Insertar Rollo (Ahora con BobinaID)
                const insertRes = await new sql.Request(transaction)
                    .input('Nombre', sql.NVarChar(100), rollName)
                    .input('AreaID', sql.VarChar(20), targetArea)
                    .input('Color', sql.VarChar(10), '#8b5cf6')
                    .input('MID', sql.Int, machineId)
                    .input('BobinaID', sql.Int, assignedBobinaId) // Nuevo campo
                    .query(`
                        INSERT INTO dbo.Rollos (Nombre, AreaID, CapacidadMaxima, ColorHex, Estado, MaquinaID, FechaCreacion, BobinaID)
                        OUTPUT INSERTED.RolloID
                        VALUES (@Nombre, @AreaID, 100, @Color, 'Abierto', @MID, GETDATE(), @BobinaID)
                    `);
                const dbRollId = insertRes.recordset[0].RolloID;

                // D. Asignar (Secuencialmente según ordenamiento previo)
                let seq = 1;
                for (const order of orders) {
                    await new sql.Request(transaction)
                        .input('OID', sql.Int, order.OrdenID)
                        .input('RID', sql.Int, dbRollId)
                        .input('Seq', sql.Int, seq)
                        .input('MID', sql.Int, machineId)
                        .input('StArea', sql.VarChar(50), machineId ? machineStatus : 'En Lote')
                        .query(`
                            UPDATE dbo.Ordenes 
                            SET RolloID = @RID, 
                                Secuencia = @Seq, 
                                Estado = 'Produccion',
                                MaquinaID = @MID,
                                EstadoenArea = @StArea
                            WHERE OrdenID = @OID
                        `);

                    // --- TRACKING HISTORIAL ---
                    await registrarHistorialOrden(transaction, order.OrdenID, 'Produccion', userId, `Auto-Asignado a Rollo ${dbRollId} (Magic Sort)`);

                    seq++;
                }

                // Track Roll Creation in History (Optional logic, usually order based) or Audit
                await registrarAuditoria(transaction, userId, 'CREACION_ROLLO_AUTO', `Rollo ${dbRollId} creado por Magic Sort (${materialName})`, ip);

                return orders.length;
            };

            // Ejecutar por Subgrupos de Material
            let cTerm = 0;
            const termByMat = groupByMaterial(groups.terminaciones);
            for (const [mat, list] of Object.entries(termByMat)) {
                cTerm += await processGroupDB(list, { namePrefix: 'Term', machineKeyword: 'Terminaciones ECOUV' }, mat);
            }

            let cUV = 0;
            const uvByMat = groupByMaterial(groups.uv);
            for (const [mat, list] of Object.entries(uvByMat)) {
                cUV += await processGroupDB(list, { namePrefix: 'UV', machineKeyword: 'UV' }, mat);
            }

            let cEco = 0;
            const ecoByMat = groupByMaterial(groups.ecosolvente);
            for (const [mat, list] of Object.entries(ecoByMat)) {
                cEco += await processGroupDB(list, { namePrefix: 'Eco', machineKeyword: 'Ecosolvente' }, mat);
            }

            // --- AUDITORIA FINAL ---
            await registrarAuditoria(transaction, userId, 'MAGIC_SORT_EXEC', `Ejecutado Magic Sort: ${cTerm} Terms, ${cUV} UV, ${cEco} Eco.`, ip);

            await transaction.commit();
            console.log(`-> Transacción Completada: T=${cTerm}, UV=${cUV}, Eco=${cEco}`);

            // ---------------------------------------------------------
            // PASO 3: PROCESAR ARCHIVOS (AL FINAL, YA CON ROLLO ASIGNADO)
            // ---------------------------------------------------------
            // Solo para grupos UV y Ecosolvente, actualizando dimensiones y magnitud
            const ordersToProcess = [...groups.uv, ...groups.ecosolvente];

            if (ordersToProcess.length > 0) {
                console.log(`-> Paso 3: Procesando archivos para ${ordersToProcess.length} órdenes...`);
                // Ejecución "Fire and Forget" o Await? El usuario pidió "dejar para el final". 
                // Haremos await para confirmar éxito total, pero ya fuera de transaction.

                const idsList = ordersToProcess.map(o => o.OrdenID).join(',');
                const filesRes = await pool.request().query(`
                    SELECT AO.ArchivoID, AO.RutaAlmacenamiento, AO.NombreArchivo, AO.Copias,
                           O.OrdenID, O.CodigoOrden, O.Cliente, O.DescripcionTrabajo
                    FROM dbo.ArchivosOrden AO
                    INNER JOIN dbo.Ordenes O ON AO.OrdenID = O.OrdenID
                    WHERE AO.OrdenID IN (${idsList})
                `);

                const files = filesRes.recordset;
                const targetDir = 'C:\\ORDENES';
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                for (const file of files) {
                    try {
                        const sourcePath = file.RutaAlmacenamiento || '';
                        let tempBuffer = null;

                        // Download
                        if (sourcePath.includes('drive.google.com')) {
                            const driveId = getDriveId(sourcePath);
                            if (driveId) { const res = await fetch(`https://drive.google.com/uc?export=download&id=${driveId}`); if (res.ok) tempBuffer = Buffer.from(await res.arrayBuffer()); }
                        } else if (sourcePath.startsWith('http')) {
                            const res = await fetch(sourcePath); if (res.ok) tempBuffer = Buffer.from(await res.arrayBuffer());
                        } else if (fs.existsSync(sourcePath)) { tempBuffer = fs.readFileSync(sourcePath); }

                        if (!tempBuffer) continue;

                        // Save Local
                        // 2. DESTINO (RENOMBRADO) - UNIFICADO
                        const sanitize = (str) => (str || '').replace(/[<>:"/\\|?*]/g, '-').trim();

                        const ext = path.extname(file.NombreArchivo || '') || '.pdf';
                        let finalExt = ext;
                        if (!finalExt && tempBuffer.slice(0, 4).toString() === '%PDF') finalExt = '.pdf';

                        // Prioridad: Usar el nombre descriptivo de la BD
                        let baseName = file.NombreArchivo;

                        // Fallback
                        if (!baseName || baseName.length < 3) {
                            const partOrder = sanitize(file.CodigoOrden || file.OrdenID.toString());
                            const partCopies = sanitize((file.Copias || 1).toString());
                            const partJoB = sanitize(file.DescripcionTrabajo || 'Trabajo');
                            const partClient = sanitize(file.Cliente || 'Cliente');
                            baseName = `${partOrder}-${partClient}-${partJoB}-Archivo (x${partCopies})`;
                        } else {
                            baseName = sanitize(baseName);
                        }

                        if (!baseName.toLowerCase().endsWith(finalExt.toLowerCase())) {
                            baseName += finalExt;
                        }

                        const newName = baseName;
                        const destPath = path.join(targetDir, newName);
                        fs.writeFileSync(destPath, tempBuffer);

                        // Measure
                        let widthM = 0, heightM = 0;
                        try {
                            const isPdf = newName.toLowerCase().endsWith('.pdf');
                            if (isPdf) { const pdfDoc = await PDFDocument.load(tempBuffer, { updateMetadata: false }); const pages = pdfDoc.getPages(); if (pages.length > 0) { const { width, height } = pages[0].getSize(); widthM = cmToM(pointsToCm(width)); heightM = cmToM(pointsToCm(height)); } }
                            else { const m = await sharp(tempBuffer).metadata(); widthM = cmToM(pixelsToCm(m.width, m.density || 72)); heightM = cmToM(pixelsToCm(m.height, m.density || 72)); }
                        } catch (e) { }

                        if (widthM > 0 && heightM > 0) {
                            // Update Archivo Metric
                            await pool.request()
                                .input('ID', sql.Int, file.ArchivoID)
                                .input('M', sql.Decimal(10, 2), heightM)
                                .input('W', sql.Decimal(10, 2), widthM)
                                .input('H', sql.Decimal(10, 2), heightM)
                                .query("UPDATE dbo.ArchivosOrden SET Metros=@M, Ancho=@W, Alto=@H, MedidaConfirmada=1 WHERE ArchivoID=@ID");

                            // Update Order Magnitud (Recalc Total)
                            await pool.request().input('OID', sql.Int, file.OrdenID)
                                .query(`
                                    UPDATE dbo.Ordenes 
                                    SET Magnitud = (
                                        SELECT CAST(SUM(ISNULL(Copias,1)*ISNULL(Metros,0)) AS DECIMAL(10,2))
                                        FROM dbo.ArchivosOrden 
                                        WHERE OrdenID = @OID
                                    )
                                    WHERE OrdenID = @OID
                                `);
                        }
                    } catch (e) { console.error(`Err File ${file.ArchivoID}:`, e.message); }
                }
            }

            res.json({ success: true, message: `Secuencia Completada: ${cTerm} Terms, ${cUV} UV, ${cEco} Eco.` });

        } catch (err) {
            if (transaction) await transaction.rollback();
            throw err; // Re-throw to outer catch
        }

    } catch (err) {
        console.error("Error MagicSort:", err);
        res.status(500).json({ error: err.message });
    }
};
exports.getGroupedOrderDetails = async (req, res) => { res.json([]); };
