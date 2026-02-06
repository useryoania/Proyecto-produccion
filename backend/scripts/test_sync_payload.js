const axios = require('axios');

async function testSync() {
    try {
        console.log("1. Obteniendo token...");
        const tokenRes = await axios.post('https://administracionuser.uy/api/apilogin/generate-token', {
            apiKey: "api_key_google_123sadas12513_user"
        });
        const token = tokenRes.data.token || tokenRes.data.accessToken || tokenRes.data;
        console.log("Token:", token.substring(0, 20) + "...");

        const payload = {
            qr: "66$*852$*Prueba DTF 1$*2$*47$*1.96$*53.90",
            precio: 53.90,
            cantidad: 1.96,
            perfil: "" // Probamos con string vacio
        };

        console.log("2. Enviando payload:", payload);

        const res = await axios.post('https://administracionuser.uy/api/apiordenes/data', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("✅ Éxito:", res.status, res.data);

    } catch (e) {
        console.error("❌ Error Sync:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

testSync();
