const logger = require('../utils/logger');

/**
 * Express middleware — loguea cada HTTP request.
 * Formato: [HTTP] METHOD /url STATUS TIMEms — user:ID
 */
module.exports = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const userId = req.user?.id || '-';
        const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms — user:${userId}`;

        if (res.statusCode >= 500) {
            logger.error(`[HTTP] ${line}`);
        } else if (res.statusCode >= 400) {
            logger.warn(`[HTTP] ${line}`);
        } else {
            logger.info(`[HTTP] ${line}`);
        }
    });

    next();
};
