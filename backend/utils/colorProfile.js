// Lee el perfil de color ICC incrustado en un archivo subido a producción.
//  - Imágenes (PNG/JPG): Sharp expone el ICC crudo en metadata.icc → se parsea el tag 'desc'/'mluc'.
//  - PDF: se lee el nombre del OutputIntent (Info / OutputConditionIdentifier) vía pdf-lib.
// Devuelve: el nombre del perfil (ej. "Adobe RGB (1998)", "U.S. Web Coated (SWOP) v2"),
//           "Sin perfil" si el archivo se leyó OK pero no trae perfil incrustado,
//           o null si no se pudo procesar (no se pisa la columna en ese caso).
const sharp = require('sharp');
const logger = require('./logger');

// Parsea la descripción de un perfil ICC crudo: tag 'desc' (ICC v2, ASCII) o 'mluc' (ICC v4, UTF-16BE).
function parseIccDescription(icc) {
    try {
        if (!icc || icc.length < 132) return null;
        const tagCount = icc.readUInt32BE(128);
        if (tagCount < 1 || tagCount > 256) return null;
        for (let i = 0; i < tagCount; i++) {
            const base = 132 + i * 12;
            if (base + 12 > icc.length) break;
            if (icc.toString('latin1', base, base + 4) !== 'desc') continue;
            const offset = icc.readUInt32BE(base + 4);
            const size = icc.readUInt32BE(base + 8);
            if (offset + 12 > icc.length) return null;
            const type = icc.toString('latin1', offset, offset + 4);
            if (type === 'desc') {
                // ICC v2: 'desc'(4) + reserved(4) + count(4) + ASCII[count]
                const count = icc.readUInt32BE(offset + 8);
                const start = offset + 12;
                const end = Math.min(start + count, offset + size, icc.length);
                return icc.toString('latin1', start, end).replace(/\0+$/, '').trim() || null;
            }
            if (type === 'mluc') {
                // ICC v4: 'mluc'(4) + reserved(4) + numRecords(4) + recSize(4) + records (lang+country+len+offset)
                if (icc.readUInt32BE(offset + 8) < 1) return null;
                const recBase = offset + 16; // primer record
                const len = icc.readUInt32BE(recBase + 4);
                const strOff = icc.readUInt32BE(recBase + 8);
                const start = offset + strOff;
                const end = Math.min(start + len, icc.length);
                let s = '';
                for (let p = start; p + 1 < end; p += 2) s += String.fromCharCode(icc.readUInt16BE(p));
                return s.replace(/\0+$/, '').trim() || null;
            }
            return null;
        }
        return null;
    } catch (_) {
        return null;
    }
}

function readPdfStr(o) {
    if (!o) return null;
    try {
        if (typeof o.decodeText === 'function') return o.decodeText();
        if (typeof o.asString === 'function') return o.asString();
        return String(o);
    } catch (_) {
        return null;
    }
}

async function extractPdfProfile(buffer) {
    try {
        const { PDFDocument, PDFName, PDFArray, PDFDict } = require('pdf-lib');
        const doc = await PDFDocument.load(buffer, { updateMetadata: false, throwOnInvalidObject: false });
        const ois = doc.catalog.lookup(PDFName.of('OutputIntents'));
        if (ois instanceof PDFArray) {
            for (let i = 0; i < ois.size(); i++) {
                const oi = ois.lookup(i);
                if (oi instanceof PDFDict) {
                    const val = readPdfStr(oi.lookup(PDFName.of('Info')))
                             || readPdfStr(oi.lookup(PDFName.of('OutputConditionIdentifier')));
                    if (val && val.trim()) return val.trim();
                }
            }
        }
        return 'Sin perfil';
    } catch (_) {
        return null;
    }
}

// buffer = bytes del archivo; hint = nombre o mimetype (para distinguir PDF de imagen).
exports.extractColorProfile = async (buffer, hint = '') => {
    const h = String(hint).toLowerCase();
    try {
        if (h.includes('pdf')) {
            return await extractPdfProfile(buffer);
        }
        const meta = await sharp(buffer).metadata();
        if (meta.icc) {
            const desc = parseIccDescription(meta.icc);
            if (desc) return desc;
        }
        return 'Sin perfil';
    } catch (e) {
        logger.warn(`[ColorProfile] No se pudo leer perfil (${hint}): ${e.message}`);
        return null;
    }
};
