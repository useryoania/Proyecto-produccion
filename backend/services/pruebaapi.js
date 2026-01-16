const axios = require('axios'); // Asegúrate de tenerlo instalado: npm install axios

async function iniciarProceso() {
    try {
        console.log("--- PASO 1: Autenticando ---");
        
        // Aquí hacemos lo mismo que hiciste en el "Body" de Postman
        const authResponse = await axios.post('http://localhost:9002/cliente/authenticate', {
            username: "goat",    // <--- Pon tu usuario real aquí
            password: "1234" // <--- Pon tu contraseña real aquí
        });

        // Guardamos el token que nos devolvió la API
        const miToken = authResponse.data.token;
        console.log("✅ Token recibido correctamente");

        console.log("\n--- PASO 2: Pidiendo el pedido 28 ---");

        // Ahora usamos ese token para pedir el pedido con sublíneas
        const pedidoResponse = await axios.get('http://localhost:9002/cliente/pedidos/28/con_sublineas', {
            headers: {
                // Esto es lo que pusiste en la pestaña 'Authorization' de Postman
                'Authorization': `Bearer ${miToken}`,
                'Accept': 'application/json'
            }
        });

        const datos = pedidoResponse.data.data;

        // --- PASO 3: Mostrar los resultados limpios ---
        console.log("✅ Pedido recuperado con éxito");
        console.log(`Cliente: ${datos.Nombre.trim()}`);
        console.log(`Total: $${datos.TotalDebe}`);
        
        console.log("\n--- DETALLE DE PRODUCTOS Y SUBLÍNEAS ---");
        datos.Lineas.forEach((linea, index) => {
            console.log(`${index + 1}. ${linea.Descripcion.trim()} (Precio: ${linea.Precio})`);
            
            // Si tiene sublíneas, las recorremos
            if (linea.Sublineas && linea.Sublineas.length > 0) {
                linea.Sublineas.forEach(sub => {
                    console.log(`   - Detalle: ${sub.Notas || "Sin notas"}`);
                    if (sub.Archivo) console.log(`     🔗 Link: ${sub.Archivo}`);
                });
            }
        });

    } catch (error) {
        // Si algo falla, aquí nos dirá exactamente qué pasó
        console.error("❌ ERROR:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Mensaje: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(error.message);
        }
    }
}

// Ejecutamos la función
iniciarProceso();