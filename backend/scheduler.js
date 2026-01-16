// 1. Cambia './controllers/tuControlador' por el nombre REAL de tu archivo
const { syncOrdersLogic } = require('./controllers/restSyncController');
const { getPool } = require('./config/db');

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

        console.log(`⏱️ Sincronización programada cada: ${tiempoStr} (${intervalMs}ms)`);

        // Ejecutar inmediatamente al arrancar para no esperar al primer intervalo
        console.log("🔄 Ejecutando primera sincronización al arrancar...");
        await syncOrdersLogic(io);

        // Programar ejecución cíclica
        setInterval(async () => {
            try {
                console.log("🔄 Ejecutando Sync Automática de Pedidos...");
                await syncOrdersLogic(io);
            } catch (err) {
                console.error("⚠️ Error en ciclo automático de Sync (Recuperando...):", err.message);
            }
        }, intervalMs);

    } catch (error) {
        console.error("❌ Error en el Scheduler:", error.message);
    }
}

module.exports = { startAutoSync };