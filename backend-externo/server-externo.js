// C:\sistema-produccion\backend-externo\server-externo.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); 

// --- Importaciones de Configuración y Rutas ---
const { getPool } = require('./config/db.config'); // Conexión a DB

// Importamos el único router que gestiona todas las rutas de exportación
const exportacionRoutes = require('./routes/exportacion.routes'); 

const app = express();

// --- Middleware ---
app.use(cors()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// --- Conectar las Rutas de la API ---

// Montamos el router de exportación en el prefijo base /api.
// Rutas finales disponibles: /api/pedidos y /api/identificadores/:codDoc
app.use('/api', exportacionRoutes); 

// Ruta de prueba simple (Health Check)
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de exportación de pedidos.' });
});

// --- Inicialización del Servidor y la DB ---
const initializeServer = async () => {
    try {
        // Intentar conectar a la base de datos antes de iniciar Express
        await getPool(); 
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
        });
    } catch (error) {
        // Si hay un error de DB o de inicialización, lo registra.
        console.error("🚫 Fallo al iniciar el servidor o conectar la DB:", error.message);
    }
};

initializeServer();