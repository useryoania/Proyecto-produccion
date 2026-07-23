// ─────────────────────────────────────────────────────────────────────────────
// Autenticación del TÓTEM por TOKEN DE DISPOSITIVO (reemplaza el chequeo por IP).
//
// El local dejó de tener IP fija, así que el tótem ya no se identifica por "desde dónde
// se conecta" sino por "qué es": un secreto que vive en ese equipo. Se activa una vez
// (/totem?activar=TOKEN), queda guardado en el navegador del tótem y viaja en cada request.
//
// Antes el chequeo de IP era SOLO cosmético (el front preguntaba y decidía mostrar la UI),
// mientras los endpoints del tótem quedaban abiertos a cualquiera. Este middleware se aplica
// a esos endpoints, así que además de resolver lo de la IP, cierra ese agujero.
//
// Si TOTEM_TOKEN no está definido, se permite todo — mismo criterio que tenía TOTEM_ALLOWED_IP
// (evita quedarse sin tótem si el .env no está actualizado, ej. durante la mudanza).
// ─────────────────────────────────────────────────────────────────────────────
const logger = require('../utils/logger');

/** Lee el token del header (o de query/body como respaldo, ej. si el kiosco no puede setear headers). */
const getTotemToken = (req) => {
    const h = (req.get && req.get('X-Totem-Token')) || (req.headers && req.headers['x-totem-token']) || '';
    return String(h || (req.query && req.query.totemToken) || (req.body && req.body.totemToken) || '').trim();
};

/** ¿El request trae el token correcto? (true también si no hay token configurado) */
const totemTokenOk = (req) => {
    const esperado = String(process.env.TOTEM_TOKEN || '').trim();
    if (!esperado) return true;
    return getTotemToken(req) === esperado;
};

/** Middleware para las rutas del tótem: sin token válido → 401. */
const totemAuth = (req, res, next) => {
    if (totemTokenOk(req)) return next();
    logger.warn(`[TOTEM] Acceso rechazado (token ausente o inválido) desde ${req.ip}`);
    return res.status(401).json({ error: 'Tótem no autorizado', authorized: false });
};

module.exports = { totemAuth, totemTokenOk, getTotemToken };
