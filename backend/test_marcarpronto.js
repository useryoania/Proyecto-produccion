const axios = require('axios');

async function testMarcarPronto() {
    try {
        console.log("Generando token...");
        const tokenRes = await axios.post(`https://administracionuser.uy/api/apilogin/generate-token`, {
            apiKey: "api_key_google_123sadas12513_user"
        });
        const token = tokenRes.data.token;
        console.log("Token obtenido:", token ? "SI" : "NO");

        const scannedValues40 = Array(40).fill('');
        scannedValues40[0] = "ECOUV-8580";

        const data1 = {
            ordenDeRetiro: "59992",
            scannedValues: ["$ORD-171"]
        };

        const data2 = {
            ordenDeRetiro: "R-59992",
            scannedValues: ["$ORD-171"]
        };

        console.log("Probando marcarpronto con R- ...");
        try {
            const res1 = await axios.post(`https://administracionuser.uy/api/apiordenesRetiro/marcarpronto`, data1, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Respuesta 1:", res1.data);
        } catch (e) {
            console.error("Error 1:", e.response?.data || e.message);
        }

        console.log("\nProbando marcarOrdenEntregada CON R- ...");
        try {
            const res2 = await axios.post(`https://administracionuser.uy/api/apiordenesRetiro/marcarOrdenEntregada`, { ordenDeRetiro: "R-59992" }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Respuesta 2:", res2.data);
        } catch (e) {
            console.error("Error 2:", e.response?.data || e.message);
        }

    } catch (error) {
        console.error("Error general:", error.message);
    }
}

testMarcarPronto();
