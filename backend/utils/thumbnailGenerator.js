const { execFile } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const execFileAsync = promisify(execFile);

// Carpeta donde se guardan los thumbnails en disco. Configurable por entorno (THUMBNAILS_PATH)
// para poder ubicarla fuera del dir de la app (p. ej. /home/thumbnails y que sobreviva a deploys).
// La URL pública sigue siendo /thumbnails/... (server.js la sirve desde esta misma carpeta).
const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || path.join(__dirname, '..', 'thumbnails');

/**
 * Genera un thumbnail JPG de la primera página de un PDF.
 * Guarda en: backend/thumbnails/{codigoOrden}/{archivoId}.jpg
 *
 * @param {Buffer} buffer   - Buffer del PDF
 * @param {string} codigoOrden - Ej: "DTF-1072"
 * @param {number} archivoId   - ID del registro en ArchivosOrden
 * @returns {string|null}   - Ruta relativa "/thumbnails/{codigoOrden}/{archivoId}.jpg" o null si falla
 */
exports.generatePdfThumbnail = async (buffer, codigoOrden, archivoId) => {
    let tmpPdf = null;
    let tmpJpg = null;
    try {
        const orderDir = path.join(THUMBNAILS_DIR, String(codigoOrden));
        fs.mkdirSync(orderDir, { recursive: true });
        const outPath = path.join(orderDir, `${archivoId}.jpg`);

        // PDF temporal en la misma carpeta del thumbnail
        tmpPdf = path.join(orderDir, `${archivoId}_tmp.pdf`);
        fs.writeFileSync(tmpPdf, buffer);

        // pdftoppm (poppler-utils) rasteriza la 1ra página a JPG, escalando el lado
        // mayor a ~600px. -singlefile escribe "<prefix>.jpg" sin sufijo de página.
        const prefix = path.join(orderDir, `${archivoId}_tmp`);
        tmpJpg = `${prefix}.jpg`;
        await execFileAsync('pdftoppm', ['-jpeg', '-singlefile', '-f', '1', '-l', '1', '-scale-to', '600', tmpPdf, prefix]);

        if (!fs.existsSync(tmpJpg)) throw new Error('pdftoppm no produjo salida');

        // Escalar a máx 300x300 SIN recortar (mantiene el aspecto completo del archivo)
        await sharp(tmpJpg)
            .resize(300, 300, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toFile(outPath);

        logger.info(`🖼️  [Thumbnail] PDF generado: ${outPath}`);
        return `/thumbnails/${codigoOrden}/${archivoId}.jpg`;

    } catch (err) {
        const hint = err.code === 'ENOENT'
            ? ' (falta poppler-utils → apt install -y poppler-utils)'
            : '';
        logger.warn(`⚠️  [Thumbnail] Error PDF ArchivoID=${archivoId}: ${err.message}${hint}`);
        return null;
    } finally {
        for (const f of [tmpPdf, tmpJpg]) {
            if (f && fs.existsSync(f)) { try { fs.unlinkSync(f); } catch (_) {} }
        }
    }
};

/**
 * Thumbnail para PNG/JPG usando Sharp directo — sin Puppeteer, muy rápido.
 */
exports.generateImageThumbnail = async (buffer, codigoOrden, archivoId) => {
    try {
        const orderDir = path.join(THUMBNAILS_DIR, String(codigoOrden));
        fs.mkdirSync(orderDir, { recursive: true });
        const outPath = path.join(orderDir, `${archivoId}.jpg`);

        await sharp(buffer)
            .resize(300, 300, { fit: 'inside' })
            .jpeg({ quality: 75 })
            .toFile(outPath);

        logger.info(`🖼️  [Thumbnail] Imagen generada: ${outPath}`);
        return `/thumbnails/${codigoOrden}/${archivoId}.jpg`;
    } catch (err) {
        logger.warn(`⚠️  [Thumbnail] Error imagen ArchivoID=${archivoId}: ${err.message}`);
        return null;
    }
};

/**
 * Dispatcher: elige el método según el tipo de archivo.
 * PDF  → Puppeteer + Sharp
 * PNG/JPG → Sharp directo
 */
exports.generateThumbnail = async (buffer, codigoOrden, archivoId, mimeOrExt = '') => {
    // Las -F (fallas internas) no se muestran al cliente → no se genera su thumbnail.
    if (String(codigoOrden || '').toUpperCase().includes('-F')) return null;
    const hint = String(mimeOrExt).toLowerCase();
    if (hint.includes('pdf')) {
        return exports.generatePdfThumbnail(buffer, codigoOrden, archivoId);
    }
    return exports.generateImageThumbnail(buffer, codigoOrden, archivoId);
};

/**
 * Retorna la URL del thumbnail si el archivo ya existe en disco.
 */
exports.getThumbnailUrl = (codigoOrden, archivoId) => {
    const filePath = path.join(THUMBNAILS_DIR, String(codigoOrden), `${archivoId}.jpg`);
    return fs.existsSync(filePath)
        ? `/thumbnails/${codigoOrden}/${archivoId}.jpg`
        : null;
};
