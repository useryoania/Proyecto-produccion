const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logsDir = process.env.LOGS_PATH || path.join(__dirname, '..', 'logs');

// Formato timestamp DD/MM/YYYY HH:mm:ss
const timestampFormat = winston.format.timestamp({
    format: () => {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    }
});

const printFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [AUDIT] ${message}${metaStr}`;
});

const auditLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(timestampFormat, printFormat),
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logsDir, 'audit-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '90d',
            maxSize: '20m',
        }),
    ],
});

/**
 * Loguear una acción de auditoría.
 * @param {string} action - ej: 'PAGO', 'ENTREGA', 'CANCELACION', 'AUTORIZACION'
 * @param {object} details - datos relevantes { orden, monto, usuario, ... }
 */
const audit = (action, details = {}) => {
    const detailStr = Object.entries(details)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ');
    auditLogger.info(`${action} ${detailStr}`);
};

module.exports = { audit, auditLogger };
