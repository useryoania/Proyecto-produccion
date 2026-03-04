const NodeCache = require('node-cache');

// Crear una instancia de NodeCache
const cache = new NodeCache({ stdTTL: 36000, checkperiod: 600 });

module.exports = cache; // Exportar la instancia
