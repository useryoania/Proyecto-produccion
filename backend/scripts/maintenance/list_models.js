require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function list() {
    const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    console.log("🔑 Usando Key:", API_KEY.substring(0, 10) + "...");

    if (!API_KEY) {
        console.error("❌ No hay API KEY configurada en .env");
        return;
    }

    // Usamos fetch directo para listar modelos y evitar errores de la librería si los hubiera
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        console.log("📡 Consultando API de Google (REST)...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Error devuelto por Google:", JSON.stringify(data.error, null, 2));
            return;
        }

        if (!data.models) {
            console.log("⚠️ No se encontraron modelos (Lista vacía).");
            console.log("Respuesta cruda:", data);
            return;
        }

        console.log("\n✅ Modelos Disponibles para tu cuenta:");
        console.log("-------------------------------------");
        data.models.forEach(m => {
            console.log(`- ${m.name.replace('models/', '')} \t(Versión: ${m.version})`);
        });
        console.log("-------------------------------------");

    } catch (error) {
        console.error("❌ Error de red:", error.message);
    }
}

list();
