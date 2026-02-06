const axios = require('axios');

async function testToken() {
    try {
        console.log("Solicitando token a https://administracionuser.uy/api/apilogin/generate-token...");
        const res = await axios.post('https://administracionuser.uy/api/apilogin/generate-token', {
            apiKey: "api_key_google_123sadas12513_user"
        });

        console.log("Status:", res.status);
        console.log("Data:", res.data);

        const token = res.data.token || res.data.accessToken || res.data;
        if (token && typeof token === 'string' && token.length > 20) {
            console.log("✅ Token obtenido correctamente (longitud " + token.length + ")");
        } else {
            console.error("❌ No se encontró token válido en la respuesta");
        }

    } catch (e) {
        console.error("❌ Error solicitando token:", e.message);
        if (e.response) {
            console.error("Detalle respuesta error:", e.response.status, e.response.data);
        }
    }
}

testToken();
