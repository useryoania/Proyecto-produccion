const axios = require('axios');

// 👇 AQUÍ ESTÁ EL CAMBIO: Nueva ruta confirmada
const ERP_API_URL = 'http://localhost:3000/api/pedidos';

exports.fetchErpOrders = async () => {
    try {
        console.log(`🔌 Conectando a: ${ERP_API_URL}`);
        const response = await axios.get(ERP_API_URL);
        
        // Verificamos si la respuesta tiene la propiedad 'data'
        // (A veces axios devuelve data.data o solo data dependiendo del backend externo)
        if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        } else if (Array.isArray(response.data)) {
            // Por si el ERP devuelve el array directo sin envoltorio "data"
            return response.data;
        } else {
            console.warn("⚠️ Estructura de respuesta inesperada del ERP:", response.data);
            return [];
        }
    } catch (error) {
        console.error(`❌ Error conectando al ERP (${ERP_API_URL}):`, error.message);
        throw new Error("No se pudo conectar con el ERP");
    }
};