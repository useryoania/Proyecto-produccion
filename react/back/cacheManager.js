const AsyncQueue = require('./utils/AsyncQueue'); // Asume que la clase AsyncQueue está en utils
const cache = require('./cache'); // Importa la instancia de NodeCache

// Crear una cola para manejar actualizaciones a la caché
const cacheUpdateQueue = new AsyncQueue();

/**
 * Actualiza la caché de manera secuencial utilizando la cola asíncrona.
 * @param {string} key - La clave de la caché a actualizar.
 * @param {function} updateFunction - Función que devuelve los datos actualizados.
 */
const updateCache = async (key, updateFunction) => {
  await cacheUpdateQueue.enqueue(async () => {
    const currentData = cache.get(key) || [];
    const updatedData = await updateFunction(currentData);
    cache.set(key, updatedData);
  });
};

module.exports = { updateCache, cache };
