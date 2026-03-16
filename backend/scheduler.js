// 1. Cambia './controllers/tuControlador' por el nombre REAL de tu archivo
const { syncOrdersLogic } = require('./controllers/RestSyncController');
const { getPool } = require('./config/db');
const logger = require('./utils/logger');

async function startAutoSync(io) {
    try {
        const pool = await getPool();

        // Consultar el intervalo desde ConfiguracionGlobal (Ej: 00:00:20)
        const res = await pool.request().query("SELECT Valor FROM ConfiguracionGlobal WHERE Clave = 'TIEMPOTRAEORDEN'");

        // Si no existe la clave, por defecto 30 segundos
        const tiempoStr = res.recordset[0]?.Valor || "00:00:30";

        // Convertir HH:mm:ss a milisegundos
        const partes = tiempoStr.split(':').map(Number);
        const intervalMs = ((partes[0] * 3600) + (partes[1] * 60) + partes[2]) * 1000;

        logger.info(`⏱️ Sincronización programada cada: ${tiempoStr} (${intervalMs}ms)`);

        // Ejecutar inmediatamente al arrancar para no esperar al primer intervalo
        // Nota: No bloqueamos con isSyncing aquí para permitir arranque, pero sí deberíamos.
        // Mejor dejar que el intervalo controle, o ejecutar con flag.
        logger.info("🔄 Ejecutando primera sincronización al arrancar...");
        // Opcional: await syncOrdersLogic(io); 
        // Si ejecutamos directo aqui, el intervalo podría solaparse si es muy corto.
        // Mejor lanzarlo "fire and forget" o manejar el flag globalmente.

        checkAndSync(io); // Primera ejecución protegida

        // Programar ejecución cíclica
        setInterval(() => { // Usamos lambda wrapper
            checkAndSync(io);
        }, intervalMs);

    } catch (error) {
        logger.error("❌ Error en el Scheduler Start:", error.message);
    }
}

// Control de concurrencia: Evita que se solapen ejecuciones si la BD está lenta
let isSyncing = false;

async function checkAndSync(io) {
    if (isSyncing) {
        logger.warn("⚠️ [Sync] Ciclo omitido: La sincronización anterior sigue en curso (Posible lentitud de red/BD).");
        return;
    }

    isSyncing = true;
    try {
        logger.info("🔄 Ejecutando Sync Automática...");
        await syncOrdersLogic(io);
    } catch (err) {
        logger.error("⚠️ Error en ciclo automático de Sync:", err.message);
    } finally {
        isSyncing = false;
        // logger.info("✅ Ciclo de Sync finalizado. Esperando siguiente turno.");
    }
}

module.exports = { startAutoSync };