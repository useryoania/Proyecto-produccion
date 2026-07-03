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
// Carpeta de imágenes de fallas anotadas (recuadro dibujado en Control). Servida en /fallas.
const FALLAS_DIR = process.env.FALLAS_PATH || path.join(__dirname, '..', 'fallas');

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
        // mayor a ~1500px (headroom para que el thumb final de 1000 quede nítido).
        const prefix = path.join(orderDir, `${archivoId}_tmp`);
        tmpJpg = `${prefix}.jpg`;
        await execFileAsync('pdftoppm', ['-jpeg', '-singlefile', '-f', '1', '-l', '1', '-scale-to', '1500', tmpPdf, prefix]);

        if (!fs.existsSync(tmpJpg)) throw new Error('pdftoppm no produjo salida');

        // Escalar a máx 1000x1000 SIN recortar (mantiene el aspecto completo del archivo)
        await sharp(tmpJpg)
            .resize(1000, 1000, { fit: 'inside' })
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

        // limitInputPixels: false → permitir PNG/JPG de gran formato (DTF/sublimación) que superan
        // el límite por defecto de Sharp (~268 MP). Igual se downscalea a 1000, así que el pico de RAM es acotado.
        await sharp(buffer, { limitInputPixels: false })
            .resize(1000, 1000, { fit: 'inside' })
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

/**
 * Guarda una imagen de falla ANOTADA (data URL base64, con el recuadro dibujado)
 * en {FALLAS_DIR}/{codigoOrden}/{archivoId}_{ts}.jpg.
 * @returns {Promise<string|null>} Ruta pública "/fallas/{codigoOrden}/{archivo}.jpg" o null si falla.
 */
exports.saveFallaImage = async (dataUrl, codigoOrden, archivoId) => {
    try {
        if (!dataUrl || typeof dataUrl !== 'string') return null;
        const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
        if (!m) return null;
        const buffer = Buffer.from(m[1], 'base64');
        const orderDir = path.join(FALLAS_DIR, String(codigoOrden));
        fs.mkdirSync(orderDir, { recursive: true });
        const fileName = `${archivoId}_${Date.now()}.jpg`;
        const outPath = path.join(orderDir, fileName);
        // Normalizar a JPG (por si viene PNG); conserva el recuadro dibujado.
        await sharp(buffer).jpeg({ quality: 85 }).toFile(outPath);
        logger.info(`🖼️  [FallaImg] Guardada: ${outPath}`);
        return `/fallas/${codigoOrden}/${fileName}`;
    } catch (err) {
        logger.warn(`⚠️  [FallaImg] Error ArchivoID=${archivoId}: ${err.message}`);
        return null;
    }
};
