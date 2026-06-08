const WMS_SQL_ENDPOINT = 'https://administracionuser.uy/api/sql';

async function fetchWMS() {
    try {
        console.log('--- WAREHOUSES (DEPÓSITOS) ---');
        const depotQuery = `SELECT id, nombre, tipo FROM Stock_Depositos;`;
        const res1 = await fetch(WMS_SQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `USE Ventas_Dev; ${depotQuery}` })
        });
        const d1 = await res1.json();
        if (d1.data) {
            d1.data.forEach(d => console.log(`[ID: ${d.id}] ${d.nombre} (${d.tipo})`));
        }

        console.log('\n--- ARTÍCULOS Y STOCK (Muestra de los primeros 15) ---');
        const articlesQuery = `
            SELECT TOP 15 v.id as variante_id, p.nombre as producto_padre, v.nombre_variante,
            ISNULL((SELECT SUM(cantidad_actual) FROM Stock_Etiquetas e WHERE e.variante_id = v.id AND e.estado='activo'), 0) as stock_total
            FROM Stock_Variantes v
            INNER JOIN Stock_Productos_Maestros p ON v.producto_maestro_id = p.id
            ORDER BY stock_total DESC;
        `;
        const res2 = await fetch(WMS_SQL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `USE Ventas_Dev; ${articlesQuery}` })
        });
        const d2 = await res2.json();
        if (d2.data) {
            d2.data.forEach(a => {
                const nombreCompleto = a.nombre_variante ? `${a.producto_padre} - ${a.nombre_variante}` : a.producto_padre;
                console.log(`Variante ID: ${a.variante_id} | ${nombreCompleto} | Stock Total: ${a.stock_total}`);
            });
        }
    } catch (e) {
        console.error("Error consultando la API:", e);
    }
}

fetchWMS();
