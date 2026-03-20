const logger = require('./logger');

const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_MS) || 500; // ms

/**
 * Wraps a mssql pool.request().query() call to detect slow queries.
 * Usage: const result = await timedQuery(pool, 'SELECT * FROM ...');
 * 
 * Also works as a patch on pool.request() if you want automatic detection.
 * For now, use it explicitly in critical paths or wrap Pool.
 */
const timedQuery = async (pool, queryString, inputs = []) => {
    const req = pool.request();
    for (const { name, type, value } of inputs) {
        req.input(name, type, value);
    }
    const start = Date.now();
    const result = await req.query(queryString);
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD) {
        logger.warn(`[SLOW_QUERY] ${duration}ms — ${queryString.substring(0, 200).replace(/\s+/g, ' ').trim()}`);
    }

    return { ...result, _duration: duration };
};

module.exports = { timedQuery, SLOW_QUERY_THRESHOLD };
