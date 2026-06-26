require('dotenv').config();

async function checkStockDepositos() {
    const wmsUrl = process.env.WMS_API_URL || 'https://administracionuser.uy/api';

    const query = `
        USE Ventas_Dev;
        SELECT 
            d.nombre as deposito,
            COUNT(e.id) as total_etiquetas,
            SUM(e.cantidad_actual) as total_cantidad
        FROM Stock_Etiquetas e
        INNER JOIN Stock_Depositos d ON e.deposito_id = d.id
        WHERE e.estado = 'activo' AND e.cantidad_actual > 0
        GROUP BY d.nombre
    `;

    try {
        const response = await fetch(`${wmsUrl}/sql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        console.log('Stock por Deposito:', data.data);
    } catch (error) {
        console.error('Error fetching stock:', error);
    }
}

checkStockDepositos();
