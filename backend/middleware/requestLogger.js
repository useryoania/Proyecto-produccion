const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logsDir = process.env.LOGS_PATH || path.join(__dirname, '..', 'logs');

// Logger dedicado para HTTP — escribe en http-YYYY-MM-DD.log, NO en combined
const httpLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => {
                const d = new Date();
                return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
            }
        }),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
    ),
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logsDir, 'http-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '7d',
            maxSize: '20m',
        }),
    ],
});

const mainLogger = require('../utils/logger');

/**
 * Express middleware — loguea cada HTTP request.
 * Formato: [HTTP] METHOD /url STATUS TIMEms — user:ID
 */
module.exports = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const userId = req.user?.id || '-';
        const line = `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms — user:${userId}`;

        if (res.statusCode >= 500) {
            mainLogger.error(line);  // Errores sí van al combined
        }
        httpLogger.info(line);       // Todo va al http.log
    });

    next();
};
