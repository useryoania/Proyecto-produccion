const axios = require('axios');

async function testMarcarPronto() {
    try {
        console.log("Generando token...");
        const tokenRes = await axios.post(`https://administracionuser.uy/api/apilogin/generate-token`, {
            apiKey: "api_key_google_123sadas12513_user"
        });
        const token = tokenRes.data.token;
        console.log("Token obtenido:", token ? "SI" : "NO");

        const valuesObj = Array(40).fill('');
        valuesObj[0] = "ECOUV-8581".trim();

        const payload = {
            ordenDeRetiro: "59993",
            scannedValues: valuesObj
        };

        const payload2 = {
            ordenDeRetiro: "R-59993",
            scannedValues: valuesObj 
        };

        console.log("Enviando marcarPronto con payload:", JSON.stringify(payload, null, 2));
        try {
            const res = await axios.post(`https://administracionuser.uy/api/apiordenesRetiro/marcarPronto`, payload, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log("Respuesta Exitosa:", res.data);
        } catch (e) {
            console.error("Error Status:", e.response?.status);
            console.error("Error Data:", e.response?.data || e.message);
        }

    } catch (error) {
        console.error("Error general:", error.message);
    }
}

testMarcarPronto();
