const axios = require('axios');
const logger = require('../utils/logger');

// 👇 AQUÍ ESTÁ EL CAMBIO: Nueva ruta confirmada
// 👇 AQUÍ ESTÁ EL CAMBIO: Nueva ruta confirmada
const ERP_API_URL = `${process.env.ERP_SECONDARY_API_URL || 'http://localhost:3000'}/api/pedidos`;

exports.fetchErpOrders = async () => {
    try {
        logger.info(`🔌 Conectando a: ${ERP_API_URL}`);
        const response = await axios.get(ERP_API_URL);

        // Verificamos si la respuesta tiene la propiedad 'data'
        // (A veces axios devuelve data.data o solo data dependiendo del backend externo)
        if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        } else if (Array.isArray(response.data)) {
            // Por si el ERP devuelve el array directo sin envoltorio "data"
            return response.data;
        } else {
            logger.warn("⚠️ Estructura de respuesta inesperada del ERP:", response.data);
            return [];
        }
    } catch (error) {
        logger.error(`❌ Error conectando al ERP (${ERP_API_URL}):`, error.message);
        throw new Error("No se pudo conectar con el ERP");
    }
};