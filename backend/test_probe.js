const axios = require('axios');

async function testMarcarPronto() {
    try {
        console.log("Generando token...");
        const tokenRes = await axios.post(`https://administracionuser.uy/api/apilogin/generate-token`, {
            apiKey: "api_key_google_123sadas12513_user"
        });
        const token = tokenRes.data.token;
        console.log("Token obtenido:", token ? "SI" : "NO");

        const codigoBase = "ECOUV-8581";

        for (let i = 0; i <= 30; i++) {
            const paddedCode = codigoBase + " ".repeat(i);

            const payload = {
                ordenDeRetiro: "59993",
                scannedValues: [paddedCode]
            };

            console.log(`Probando con ${i} espacios... Longitud total: ${paddedCode.length}`);
            try {
                const res = await axios.post(`https://administracionuser.uy/api/apiordenesRetiro/marcarPronto`, payload, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`¡EXITO CON ${i} ESPACIOS!`, res.data);
                break;
            } catch (e) {
                // Falla esperada si no es el padding correcto o hay otro error
                // console.log(`Fallo con ${i} espacios. Status: ${e.response?.status}`);
            }
        }
    } catch (error) {
        console.error("Error general:", error.message);
    }
}

testMarcarPronto();
