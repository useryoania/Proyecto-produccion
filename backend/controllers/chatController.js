require('dotenv').config();
const { getPool, sql } = require('../config/db');
const localFileService = require('../services/localFileService');
const n8nService = require('../services/n8nService');

// --- HELPERS IA (Estrategia Gemini Pro) ---
async function callGeminiREST(prompt, apiKey) {

    // ESTRATEGIA: FUERZA BRUTA DE MODELOS (Varios intentos)
    const attempts = [
        { model: "gemini-1.5-flash", version: "v1beta" },      // Flash Beta
        { model: "gemini-1.5-flash-001", version: "v1beta" },  // Flash Pinned 001
        { model: "gemini-1.5-flash-002", version: "v1beta" },  // Flash Pinned 002
        { model: "gemini-2.0-flash-exp", version: "v1beta" },  // Flash 2.0 (Experimental)
        { model: "gemini-1.5-pro", version: "v1beta" },        // Pro 1.5
        { model: "gemini-pro", version: "v1beta" }             // Pro 1.0 Legacy
    ];

    let lastError = null;

    for (const attempt of attempts) {
        try {
            const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;
            const body = { contents: [{ parts: [{ text: prompt }] }] };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(`${attempt.model}: ${data.error?.message || response.statusText}`);

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                console.log(`✅ [IA CONNECT] Éxito con: ${attempt.model}`);
                return data.candidates[0].content.parts[0].text;
            }

        } catch (err) {
            console.warn(`❌ Falló ${attempt.model}: ${err.message}`);
            lastError = err;
        }
    }

    console.error("❌ MURIERON TODOS LOS MODELOS IA.");
    return null;
}


exports.handleChatMessage = async (req, res) => {
    try {
        const { message, userId, mode } = req.body;
        console.log(`[CHAT] User: ${userId} | Mode: ${mode} | Msg: "${message}"`);

        let API_KEY = process.env.GEMINI_API_KEY || "";
        let responseText = null;

        // 1. INTENTO DE PLANIFIACIÓN
        if (API_KEY.length > 20 && !API_KEY.includes('INSERT')) {
            const context1 = mode === 'drive'
                ? `Usuario busca info técnica. Query: "${message}". Responde JSON: { "action": "SEARCH_LOCAL", "query": "palabras_clave" }`
                : `Usuario busca datos SQL. Tablas: Ordenes. Query: "${message}". Responde JSON: { "action": "QUERY_DB", "query": "SELECT TOP 5..." }`;

            responseText = await callGeminiREST(context1, API_KEY);
        }

        let actionPlan = { action: "NONE" };

        // 2. LOGICA FAIL-SAFE
        if (!responseText) {
            console.warn("⚠️ IA Muerta en Planificación. Activando Cerebro de Respaldo.");
            if (mode === 'drive') {
                const cleanQuery = message.replace(/buscar|manual|procedimiento|guia/gi, '').trim();
                actionPlan = { action: "SEARCH_LOCAL", query: cleanQuery || message };
            } else {
                return res.json({ reply: "⚠️ Error de conexión con IA. No puedo generar SQL." });
            }
        } else {
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            try { actionPlan = JSON.parse(responseText); } catch (e) { }
        }

        // 3. EJECUCIÓN (Lectura de Disco)
        let toolOutput = "";

        if (actionPlan.action === 'SEARCH_LOCAL' || actionPlan.action === 'SEARCH_DRIVE') {
            try {
                // 1. INTENTO CON N8N (Google Drive / Flujo Externo)
                console.log("🔄 Intentando búsqueda vía n8n...");
                const n8nResult = await n8nService.searchInDrive(actionPlan.query);

                if (n8nResult && n8nResult !== "ERROR_N8N_OFFLINE") {
                    toolOutput = n8nResult;
                    console.log("✅ Datos obtenidos desde n8n.");
                } else {
                    // 2. FALLBACK A LOCAL (Si n8n está apagado o falla)
                    console.log("⚠️ n8n no disponible. Usando búsqueda local.");
                    toolOutput = await localFileService.searchFiles(actionPlan.query);
                }

            } catch (err) {
                console.warn("⚠️ Error n8n, cayendo a local:", err.message);
                try {
                    toolOutput = await localFileService.searchFiles(actionPlan.query);
                } catch (e) { toolOutput = "Error Local: " + e.message; }
            }

        } else if (actionPlan.action === 'QUERY_DB') {
            try {
                if (/UPDATE|DELETE|DROP|INSERT/i.test(actionPlan.query)) throw new Error("Solo lectura.");
                const pool = await getPool();
                const sqlRes = await pool.request().query(actionPlan.query);
                toolOutput = "Resultados: " + JSON.stringify(sqlRes.recordset);
            } catch (err) { toolOutput = "Error SQL: " + err.message; }
        }

        // 4. RESPUESTA FINAL (EL RESUMEN)

        // Si no hay output útil
        if (toolOutput.includes("No encontré")) {
            return res.json({ reply: toolOutput });
        }

        // INTENTO DE RESUMEN CON IA
        if (API_KEY.length > 20) {
            console.log("📝 Intentando resumir con IA...");
            const finalPrompt = `Analiza la siguiente BIBLIOTECA y responde la pregunta.
            
            BIBLIOTECA:
            ${toolOutput}
            
            PREGUNTA: "${message}"
            
            INSTRUCCIÓN: 
            1. Responde SIEMPRE con formato MARKDOWN limpio y profesional.
            2. Usa **Negritas** para resaltar conceptos y Títulos (###) para separar secciones.
            3. Si enumeras pasos, usa listas numéricas. Si comparas datos, usa TABLAS.
            4. Se conciso y directo.
            5. AL PIE: Indica la fuente así: **📄 Fuente:** [NombreArchivo]`;

            const finalReply = await callGeminiREST(finalPrompt, API_KEY);

            if (finalReply) {
                console.log("✅ RESUMEN GENERADO EXITOSAMENTE.");
                return res.json({ reply: finalReply });
            }
        }

        // Si falló el resumen, mandamos el texto crudo (fe de erratas)
        // PERO LIMPIAMOS EL HTML PARA QUE SEA LEGIBLE
        console.warn("⚠️ Falló el resumen IA. Enviando texto limpio.");
        const cleanOutput = toolOutput.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        res.json({ reply: "⚠️ **(Sin IA - Texto Extraído)**\n\n" + cleanOutput.substring(0, 4000) + "..." });

    } catch (error) {
        console.error("FATAL CHAT:", error);
        res.json({ reply: "❌ Error Fatal: " + error.message });
    }
};

exports.testGeminiConnection = async (req, res) => {
    res.send("Endpoint activo.");
};
