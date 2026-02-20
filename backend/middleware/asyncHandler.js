/**
 * Async Handler Wrapper
 * Envuelve controllers async para que los errores se propaguen
 * automáticamente al middleware global de error de Express.
 * 
 * Uso: const asyncHandler = require('../middleware/asyncHandler');
 *      exports.myRoute = asyncHandler(async (req, res) => { ... });
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
