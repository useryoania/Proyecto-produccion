const axios = require('axios');

async function testSync() {
    try {
        console.log("1. Obteniendo token...");
        const tokenRes = await axios.post('https://administracionuser.uy/api/apilogin/generate-token', {
            apiKey: "api_key_google_123sadas12513_user"
        });
        const token = tokenRes.data.token || tokenRes.data.accessToken || tokenRes.data;

        // TEST 1: Strings
        console.log("\n--- TEST 1: Strings ---");
        try {
            await axios.post('https://administracionuser.uy/api/apiordenes/data', {
                qr: "66$*852$*Prueba DTF 1$*2$*47$*1.96$*53.90",
                precio: "53.90",
                cantidad: "1.96",
                perfil: "Ninguo"
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log("✅ Éxito Strings");
        } catch (e) {
            console.log("❌ Fallo Strings:", e.response?.data || e.message);
        }

        // TEST 2: QR Diferente (Fake)
        console.log("\n--- TEST 2: Fake QR ---");
        try {
            await axios.post('https://administracionuser.uy/api/apiordenes/data', {
                qr: "9999$*852$*TEST FAKE$*2$*47$*1.96$*53.90",
                precio: 53.90,
                cantidad: 1.96,
                perfil: ""
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log("✅ Éxito Fake QR");
        } catch (e) {
            console.log("❌ Fallo Fake QR:", e.response?.data || e.message);
        }

    } catch (MainE) {
        console.error("Main Error:", MainE.message);
    }
}

testSync();
