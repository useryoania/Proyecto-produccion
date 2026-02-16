require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { poolPromise } = require('./src/config/db');

// Importar las rutas de sincronización
const syncRoutes = require('./src/routes/syncRoutes');

const app = express();

// --- MIDDLEWARES ---
app.use(cors()); // Permite conexiones desde tu frontend (Vite/React)
app.use(express.json()); // Permite recibir datos en formato JSON

// --- CONFIGURACIÓN DE SERVIDOR HTTP Y SOCKETS ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // En producción, aquí pondrías la URL de tu web
        methods: ["GET", "POST"]
    }
});

// Compartir la instancia de socket.io con toda la app
// Esto permite usar 'req.app.get("socketio")' en los controladores
app.set('socketio', io);

// --- RUTAS ---

// Ruta base de prueba
app.get('/', (req, res) => {
    res.send('🚀 Servidor Macrosoft Backend funcionando');
});

// Ruta para probar la conexión a SQL Server
app.get('/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT @@VERSION as version');
        res.json({ 
            status: 'Conectado a SQL Server', 
            db_version: result.recordset[0].version 
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al conectar a SQL', details: err.message });
    }
});

// Vincular las rutas de importación de Google Sheets
// Tus endpoints ahora serán: http://localhost:3000/api/importar-base
app.use('/api', syncRoutes);

// --- EVENTOS DE SOCKET.IO ---
io.on('connection', (socket) => {
    console.log(`📱 Nuevo cliente conectado ID: ${socket.id}`);

    // Ejemplo: Unirse a una sala (Room) por área
    socket.on('join_area', (area) => {
        socket.join(area);
        console.log(`👤 Usuario unido al área: ${area}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado');
    });
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('----------------------------------------------------');
    console.log(`🚀 SERVIDOR MACROSOFT CORRIENDO EN: http://localhost:${PORT}`);
    console.log(`📊 PRUEBA SQL: http://localhost:${PORT}/test-db`);
    console.log(`🔄 SYNC DRIVE: http://localhost:${PORT}/api/importar-base`);
    console.log('----------------------------------------------------');
});