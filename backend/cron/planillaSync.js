const axios = require('axios');
const cron = require('node-cron');
const { getPool, sql } = require('../config/db');

// --- CONFIGURACIÓN ---
const PLANILLA_URL = process.env.PLANILLA_SCRIPT_URL;
const RUN_EVERY_X_MINUTES = 5;

// --- FUNCIÓN DE SINCRONIZACIÓN ---
async function syncPlanilla() {
    // 1. CHEQUEO GLOBAL (.ENV) - INTERRUPTOR MAESTRO
    if (process.env.ENABLE_PLANILLA_SYNC !== 'true') {
        // Silencioso para no saturar logs si está desactivado a propósito
        return;
    }

    console.log(`[PlanillaSync] Iniciando sincronización a las ${new Date().toLocaleTimeString()}...`);

    if (!PLANILLA_URL) {
        console.warn("[PlanillaSync] No hay URL configurada en .env (PLANILLA_SCRIPT_URL). Omitiendo.");
        return;
    }

    try {
        // 2. OBTENER FILAS NUEVAS APUNTANDO AL SCRIPT
        const res = await axios.get(PLANILLA_URL);
        const data = res.data;

        // DEBUG: VER QUÉ RESPONDE LA PLANILLA
        console.log(`[PlanillaSync DEBUG] Respuesta:`, JSON.stringify(data).substring(0, 200) + "...");

        if (data.status === "NO_NEW_DATA" || data.status === "NO_DATA") {
            // console.log("[PlanillaSync] No hay nuevos datos.");
            return;
        }

        if (data.status === "OK" && data.data && data.data.length > 0) {
            console.log(`[PlanillaSync] Recibidos ${data.data.length} pedidos nuevos.`);

            // 3. PROCESAR CADA PEDIDO
            for (const pedido of data.data) {
                try {
                    // LLAMADA LOCAL A LA API DE INTEGRACIÓN
                    // Usamos la KEY interna para autenticarnos como si fuéramos externos
                    await axios.post('http://localhost:5000/api/web-orders/integration/create', pedido, {
                        headers: { 'x-api-key': process.env.INTEGRATION_API_KEY || 'macrosoft-secret-key' }
                    });

                    console.log(`✅ [PlanillaSync] Pedido fila ${pedido.rowNumber} creado OK.`);

                } catch (errPedido) {
                    console.error(`❌ [PlanillaSync] Error fila ${pedido.rowNumber}:`, errPedido.message);
                }
            }

            console.log(`[PlanillaSync] Lote procesado. Última fila: ${data.processedUntil}`);
        }

    } catch (error) {
        console.error("[PlanillaSync] Error de conexión:", error.message);
    }
}

// --- ACTIVAR CRON ---
// Se ejecuta cada 5 minutos
cron.schedule(`*/${RUN_EVERY_X_MINUTES} * * * *`, syncPlanilla);

// Ejecutar INMEDIATAMENTE al iniciar (tras 5s de espera para DB)
setTimeout(() => {
    console.log("[PlanillaSync] Ejecutando sincronización inicial...");
    syncPlanilla();
}, 5000);

console.log(`[PlanillaSync] Cron cargado (Intervalo: ${RUN_EVERY_X_MINUTES}m). Estado: ${process.env.ENABLE_PLANILLA_SYNC === 'true' ? 'ACTIVO ✅' : 'INACTIVO ❌'}`);

module.exports = { syncPlanilla };
