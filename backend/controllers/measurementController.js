const { getPool, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// --- HELPERS ---
const pointsToCm = (points) => (points / 72) * 2.54;
const pixelsToCm = (pixels, dpi) => (pixels / dpi) * 2.54;
const cmToM = (cm) => cm / 100;

// Extraer ID de Drive desde URL
const getDriveId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:id=|\/d\/)([\w-]+)/);
    return match ? match[1] : null;
};

// --- 1. OBTENER LISTA ---
// --- 1. OBTENER LISTA ---
exports.getOrdersToMeasure = async (req, res) => {
    const { area } = req.query;
    try {
        const pool = await getPool();
        let areaFilter = area;
        if (area === 'SUBLIMACION') areaFilter = 'SUB';
        if (area === 'BORDADO') areaFilter = 'BORD';

        const result = await pool.request()
            .input('Area', sql.VarChar(20), areaFilter)
            .query(`
                SELECT 
                    o.OrdenID as id, o.CodigoOrden as code, o.Cliente as client, o.RolloID as rollId, 
                    ISNULL(R.Nombre, 'Lote ' + CAST(o.RolloID AS VARCHAR)) as rollName,
                    ISNULL(o.Material, 'Sin Material') as material, o.Prioridad as priority, o.FechaIngreso,
                    (
                        SELECT 
                            ArchivoID as id, NombreArchivo as name, RutaAlmacenamiento as url,
                            TipoArchivo as type, ISNULL(Copias, 1) as copies, ISNULL(Metros, 0) as confirmed, 
                            Ancho as autoWidth, Alto as autoHeight
                        FROM dbo.ArchivosOrden 
                        WHERE OrdenID = o.OrdenID 
                        FOR JSON PATH
                    ) as files
                FROM dbo.Ordenes o
                LEFT JOIN dbo.Rollos R ON o.RolloID = R.RolloID
                WHERE o.AreaID = @Area AND o.Estado NOT IN ('Entregado', 'Cancelado', 'Finalizado')
                AND EXISTS (SELECT 1 FROM dbo.ArchivosOrden WHERE OrdenID = o.OrdenID)
                ORDER BY o.Prioridad DESC, o.FechaIngreso ASC
            `);

        const data = result.recordset.map(row => ({
            ...row,
            files: (row.files && row.files !== 'null') ? JSON.parse(row.files) : []
        }));
        res.json(data);
    } catch (err) {
        console.error("❌ Error SQL:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ... (measureFiles stays the same) ...

// --- 4. PROCESAMIENTO POR LOTES (DESCARGAR + MEDIR) ---
exports.processBatch = async (req, res) => {
    const { fileIds } = req.body;
    const targetDir = 'C:\\ORDENES';
    const results = [];

    if (!fileIds || fileIds.length === 0) return res.status(400).json({ error: "No files provided" });

    try {
        const pool = await getPool();

        // Asegurar directorio
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Obtener información detallada para renombrado
        const filesQuery = await pool.request().query(`
            SELECT 
                AO.ArchivoID, AO.RutaAlmacenamiento, AO.NombreArchivo, AO.Copias,
                O.OrdenID, O.CodigoOrden, O.Cliente, O.DescripcionTrabajo
            FROM dbo.ArchivosOrden AO
            INNER JOIN dbo.Ordenes O ON AO.OrdenID = O.OrdenID
            WHERE AO.ArchivoID IN (${fileIds.join(',')})
        `);

        for (const file of filesQuery.recordset) {
            let log = { id: file.ArchivoID, status: 'OK' };
            try {
                // 1. ORIGEN (Descarga Robusta)
                const sourcePath = file.RutaAlmacenamiento || '';
                let tempBuffer = null;

                if (sourcePath.includes('drive.google.com')) {
                    const driveId = getDriveId(sourcePath);
                    if (!driveId) throw new Error('Link de Drive inválido');
                    const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
                    const res = await fetch(downloadUrl);
                    if (!res.ok) throw new Error(`Status ${res.status} al descargar de Drive`);
                    tempBuffer = Buffer.from(await res.arrayBuffer());
                } else if (sourcePath.startsWith('http')) {
                    const res = await fetch(sourcePath);
                    if (!res.ok) throw new Error(`Status ${res.status} al descargar de Web`);
                    tempBuffer = Buffer.from(await res.arrayBuffer());
                } else if (fs.existsSync(sourcePath)) {
                    tempBuffer = fs.readFileSync(sourcePath);
                } else {
                    throw new Error('Archivo origen no encontrado en ruta local ni es URL válida');
                }

                // VALIDACIÓN BÁSICA DEL CONTENIDO
                if (!tempBuffer || tempBuffer.length === 0) throw new Error("El archivo descargado está vacío (0 bytes)");

                // Detectar si es HTMLError (común en Drive cuando falla la cuota o auth)
                const header = tempBuffer.slice(0, 15).toString().trim().toLowerCase();
                if (header.startsWith('<!doctype html') || header.startsWith('<html')) {
                    throw new Error("El archivo descargado parece ser una página HTML (posible error de Google Drive o login).");
                }

                // 2. DESTINO (RENOMBRADO)
                // Usamos guiones para reemplazar caracteres inválidos
                const sanitize = (str) => (str || '').replace(/[<>:"/\\|?*]/g, '-').trim();

                const ext = path.extname(file.NombreArchivo || '') || '.pdf';
                let finalExt = ext;
                if (!finalExt && tempBuffer.slice(0, 4).toString() === '%PDF') finalExt = '.pdf';

                // Prioridad: Usar el nombre descriptivo que ya generamos en la base de datos
                let baseName = file.NombreArchivo;

                // Fallback: Si no hay nombre en BD, lo construimos
                if (!baseName || baseName.length < 3) {
                    const partOrder = sanitize(file.CodigoOrden || file.OrdenID.toString());
                    const partCopies = sanitize((file.Copias || 1).toString());
                    const partJoB = sanitize(file.DescripcionTrabajo || 'Trabajo');
                    const partClient = sanitize(file.Cliente || 'Cliente');
                    baseName = `${partOrder}-${partClient}-${partJoB}-Archivo (x${partCopies})`;
                } else {
                    baseName = sanitize(baseName);
                }

                // Asegurar extensión
                if (!baseName.toLowerCase().endsWith(finalExt.toLowerCase())) {
                    baseName += finalExt;
                }

                const newName = baseName;
                const destPath = path.join(targetDir, newName);

                // Escribir archivo
                fs.writeFileSync(destPath, tempBuffer);
                log.savedTo = destPath;

                // 3. MEDICIÓN AUTOMATICA
                let widthM = 0;
                let heightM = 0;

                try {
                    const isPdf = finalExt.toLowerCase() === '.pdf' || (tempBuffer.slice(0, 4).toString() === '%PDF');

                    if (isPdf) {
                        const pdfDoc = await PDFDocument.load(tempBuffer, { updateMetadata: false });
                        const pages = pdfDoc.getPages();
                        if (pages.length > 0) {
                            const { width, height } = pages[0].getSize();
                            widthM = cmToM(pointsToCm(width));
                            heightM = cmToM(pointsToCm(height));
                        }
                    } else {
                        const metadata = await sharp(tempBuffer).metadata();
                        const density = metadata.density || 72;
                        widthM = cmToM(pixelsToCm(metadata.width, density));
                        heightM = cmToM(pixelsToCm(metadata.height, density));
                    }
                } catch (measureErr) {
                    console.error("Error midiendo:", measureErr);
                    // No fallamos el proceso de descarga, solo avisamos
                    log.measureError = measureErr.message;
                }

                log.width = parseFloat(widthM.toFixed(2));
                log.height = parseFloat(heightM.toFixed(2));

                // 4. GUARDAR EN BD
                if (log.width > 0 && log.height > 0) {
                    await new sql.Request(pool)
                        .input('ID', sql.Int, file.ArchivoID)
                        .input('M', sql.Decimal(10, 2), log.height)
                        .input('W', sql.Decimal(10, 2), log.width)
                        .input('H', sql.Decimal(10, 2), log.height)
                        .query(`
                            UPDATE dbo.ArchivosOrden 
                            SET MedidaConfirmada = @M, Ancho = @W, Alto = @H
                            WHERE ArchivoID = @ID
                        `);
                }

            } catch (err) {
                log.status = 'ERROR';
                log.error = err.message;
            }
            results.push(log);
        }

        res.json({ success: true, results });

    } catch (err) {
        console.error("Error Batch Process:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- 2. MEDIR ARCHIVOS (AHORA CON SOPORTE PARA DRIVE) ---
exports.measureFiles = async (req, res) => {
    const { fileIds } = req.body;
    const results = [];

    try {
        const pool = await getPool();
        if (!fileIds || fileIds.length === 0) return res.json({ success: true, results: [] });

        const filesQuery = await pool.request().query(`
            SELECT ArchivoID, RutaAlmacenamiento, TipoArchivo 
            FROM dbo.ArchivosOrden 
            WHERE ArchivoID IN (${fileIds.join(',')})
        `);

        for (const file of filesQuery.recordset) {
            const filePath = file.RutaAlmacenamiento || '';
            let fileBuffer = null;

            try {
                // CASO A: Es un Link de Google Drive
                if (filePath.includes('drive.google.com')) {
                    const driveId = getDriveId(filePath);
                    if (!driveId) throw new Error('Link de Drive inválido');

                    // Convertimos a link de descarga directa
                    const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
                    console.log(`⬇️ Descargando para medir: ${file.ArchivoID}`);

                    const response = await fetch(downloadUrl);
                    if (!response.ok) throw new Error(`Falló descarga Drive (${response.status})`);

                    const arrayBuffer = await response.arrayBuffer();
                    fileBuffer = Buffer.from(arrayBuffer);
                }
                // CASO B: Es un Link Web normal (http...)
                else if (filePath.startsWith('http')) {
                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error('Falló descarga Web');
                    const arrayBuffer = await response.arrayBuffer();
                    fileBuffer = Buffer.from(arrayBuffer);
                }
                // CASO C: Es un archivo Local en el Servidor (C:\...)
                else {
                    if (!fs.existsSync(filePath)) {
                        results.push({ id: file.ArchivoID, width: 0, height: 0, area: 0, error: 'No encontrado en disco local' });
                        continue;
                    }
                    fileBuffer = fs.readFileSync(filePath);
                }

                // --- LÓGICA DE MEDICIÓN (COMÚN) ---
                let widthCm = 0;
                let heightCm = 0;

                // Detectar si es PDF por extensión o por tipo en DB
                const isPdf = filePath.toLowerCase().endsWith('.pdf') || file.TipoArchivo === 'pdf' || (fileBuffer && fileBuffer.slice(0, 4).toString() === '%PDF');

                if (isPdf) {
                    const pdfDoc = await PDFDocument.load(fileBuffer, { updateMetadata: false });
                    const pages = pdfDoc.getPages();
                    if (pages.length > 0) {
                        const { width, height } = pages[0].getSize();
                        widthCm = pointsToCm(width);
                        heightCm = pointsToCm(height);
                    }
                } else {
                    const metadata = await sharp(fileBuffer).metadata();
                    const density = metadata.density || 72;
                    widthCm = pixelsToCm(metadata.width, density);
                    heightCm = pixelsToCm(metadata.height, density);
                }

                const widthM = cmToM(widthCm);
                const heightM = cmToM(heightCm);
                const areaM2 = widthM * heightM;

                results.push({
                    id: file.ArchivoID,
                    width: parseFloat(widthM.toFixed(2)),
                    height: parseFloat(heightM.toFixed(2)),
                    area: parseFloat(areaM2.toFixed(4))
                });

            } catch (error) {
                console.error(`❌ Error midiendo archivo ${file.ArchivoID}:`, error.message);
                results.push({ id: file.ArchivoID, width: 0, height: 0, area: 0, error: 'Error al leer/descargar archivo' });
            }
        }
        res.json({ success: true, results });
    } catch (err) {
        console.error("Error general measureFiles:", err);
        res.status(500).json({ error: "Error interno medidor." });
    }
};

// --- 3. GUARDAR RESULTADOS ---
const { registrarAuditoria, registrarHistorialOrden } = require('../services/trackingService');

// ... (rest of imports unchanged)

// ... (previous functions unchanged)

// --- 3. GUARDAR RESULTADOS ---
exports.saveMeasurements = async (req, res) => {
    console.log("🛠️ SAVE MEASUREMENTS:", req.body);
    const { measurements, userId } = req.body;
    const currentUserId = userId || 1;
    const userIp = req.ip || req.connection.remoteAddress || '';

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const affectedOrders = new Set();

            for (const m of measurements) {
                // 1. Obtener OrdenID para historial
                const fileInfo = await new sql.Request(transaction)
                    .input('FID', sql.Int, m.id)
                    .query("SELECT OrdenID FROM dbo.ArchivosOrden WHERE ArchivoID = @FID");

                if (fileInfo.recordset[0]) {
                    affectedOrders.add(fileInfo.recordset[0].OrdenID);
                }

                // 2. Actualizar Medidas
                await new sql.Request(transaction)
                    .input('ID', sql.Int, m.id)
                    .input('MetrosVal', sql.Decimal(10, 2), m.confirmed)
                    .input('W', sql.Decimal(10, 2), m.width || 0)
                    .input('H', sql.Decimal(10, 2), m.height || 0)
                    .query(`UPDATE dbo.ArchivosOrden SET Metros = @MetrosVal, Ancho = @W, Alto = @H, MedidaConfirmada = 1 WHERE ArchivoID = @ID`);
            }

            // 3. Registrar Historial por Orden Afectada
            for (const orderId of affectedOrders) {
                // Obtenemos estado actual para no cambiarlo
                const orderData = await new sql.Request(transaction)
                    .input('OID', sql.Int, orderId)
                    .query("SELECT Estado FROM dbo.Ordenes WHERE OrdenID = @OID");

                const currentStatus = orderData.recordset[0]?.Estado || 'Pendiente';

                // RECALCULO AUTOMATICO DE MAGNITUD TOTAL DE LA ORDEN
                const calcRes = await new sql.Request(transaction)
                    .input('OID', sql.Int, orderId)
                    .query(`
                        SELECT SUM(ISNULL(Copias, 1) * ISNULL(Metros, 0)) as Total 
                        FROM dbo.ArchivosOrden 
                        WHERE OrdenID = @OID
                    `);
                const newTotal = calcRes.recordset[0].Total || 0;

                // Actualizar Magnitud en la Orden
                await new sql.Request(transaction)
                    .input('OID', sql.Int, orderId)
                    .input('Mag', sql.VarChar(50), newTotal.toFixed(2))
                    .query("UPDATE dbo.Ordenes SET Magnitud = @Mag WHERE OrdenID = @OID");

                await registrarHistorialOrden(transaction, orderId, currentStatus, currentUserId, `Medición actualizada. Nueva Magnitud: ${newTotal.toFixed(2)}m`);
            }

            // 4. Registrar Auditoría Global
            await registrarAuditoria(transaction, currentUserId, 'MEDICION_FILES', `Actualizados ${measurements.length} archivos`, userIp);

            await transaction.commit();
            res.json({ success: true });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error("Error guardando medidas:", err);
        res.status(500).json({ error: err.message });
    }
};