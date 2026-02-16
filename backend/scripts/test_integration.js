const axios = require('axios');

async function testIntegrationOrder() {
    console.log("🚀 Iniciando prueba de Integración (Planilla) V2...");

    const API_URL = 'http://localhost:5000/api/web-orders/integration/create';

    // FORMATO ALINEADO CON EL NUEVO SISTEMA (SERVICIOS)
    const payload = {
        codCliente: 1899, // Kasak
        nombreCliente: "Cliente Pruebas Planilla",
        nombreTrabajo: "Pedido Test Integración (Script Correcto)",
        prioridad: "Alta",
        idServicio: "dtf", // Opcional si se especifica en servicios
        servicios: [
            {
                areaId: "dtf", // Area ID
                items: [
                    {
                        fileName: "diseño_final.png",
                        cantidad: 10,
                        width: 0.30, // Metros
                        height: 0.42, // Metros
                        nota: "Prueba V2 Exito"
                    }
                ]
            }
        ]
    };

    try {
        console.log("📡 Enviando pedido...");
        const res = await axios.post(API_URL, payload, {
            headers: { 'x-api-key': 'planillas-macrosoft-2026' }
        });
        console.log("✅ RESULTADO:", JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error("❌ ERROR:", error.response ? error.response.data : error.message);
    }
}

testIntegrationOrder();
