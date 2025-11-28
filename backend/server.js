const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
  server: 'userdb.cv8sc0gu009m.us-east-2.rds.amazonaws.com',
  database: 'ProductionControl',
  user: 'admin',
  password: '7loFPNdyrRylJAKiZYK7', // ← AQUÍ DIRECTAMENTE
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Conexión a la base de datos
let pool;

const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a SQL Server en AWS');
  } catch (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
  }
};

connectDB();

// 📊 ENDPOINTS PARA ÓRDENES DE PRODUCCIÓN

// GET - Obtener todas las órdenes
app.get('/api/ordenes', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT o.*, a.Nombre as AreaNombre, c.Nombre as ClienteNombre, m.Nombre as MaquinaNombre
      FROM Ordenes o
      LEFT JOIN Areas a ON o.AreaID = a.AreaID
      LEFT JOIN Clientes c ON o.ClienteID = c.ClienteID
      LEFT JOIN Maquinas m ON o.MaquinaID = m.MaquinaID
      ORDER BY o.FechaIngreso DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Obtener orden por ID
app.get('/api/ordenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('ordenId', sql.VarChar, id)
      .query(`
        SELECT o.*, a.Nombre as AreaNombre, c.Nombre as ClienteNombre, m.Nombre as MaquinaNombre
        FROM Ordenes o
        LEFT JOIN Areas a ON o.AreaID = a.AreaID
        LEFT JOIN Clientes c ON o.ClienteID = c.ClienteID
        LEFT JOIN Maquinas m ON o.MaquinaID = m.MaquinaID
        WHERE o.OrdenID = @ordenId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Crear nueva orden
app.post('/api/ordenes', async (req, res) => {
  try {
    const {
      OrdenID, AreaID, ClienteID, DescripcionTrabajo, Prioridad, 
      Variante, Estado, MaquinaID, RolloID, Magnitud, Nota, FechaEstimadaEntrega
    } = req.body;

    const result = await pool.request()
      .input('OrdenID', sql.VarChar, OrdenID)
      .input('AreaID', sql.VarChar, AreaID)
      .input('ClienteID', sql.VarChar, ClienteID)
      .input('DescripcionTrabajo', sql.VarChar, DescripcionTrabajo)
      .input('Prioridad', sql.VarChar, Prioridad)
      .input('Variante', sql.VarChar, Variante)
      .input('Estado', sql.VarChar, Estado)
      .input('MaquinaID', sql.VarChar, MaquinaID)
      .input('RolloID', sql.VarChar, RolloID)
      .input('Magnitud', sql.VarChar, Magnitud)
      .input('Nota', sql.Text, Nota)
      .input('FechaEstimadaEntrega', sql.DateTime, FechaEstimadaEntrega)
      .query(`
        INSERT INTO Ordenes (
          OrdenID, AreaID, ClienteID, DescripcionTrabajo, Prioridad, 
          Variante, Estado, MaquinaID, RolloID, Magnitud, Nota, FechaEstimadaEntrega
        ) 
        VALUES (
          @OrdenID, @AreaID, @ClienteID, @DescripcionTrabajo, @Prioridad,
          @Variante, @Estado, @MaquinaID, @RolloID, @Magnitud, @Nota, @FechaEstimadaEntrega
        )
      `);

    res.status(201).json({ message: 'Orden creada exitosamente', OrdenID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - Actualizar orden
app.put('/api/ordenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      AreaID, ClienteID, DescripcionTrabajo, Prioridad, Variante,
      Estado, Progreso, MaquinaID, RolloID, Magnitud, Nota, FechaEstimadaEntrega
    } = req.body;

    const result = await pool.request()
      .input('OrdenID', sql.VarChar, id)
      .input('AreaID', sql.VarChar, AreaID)
      .input('ClienteID', sql.VarChar, ClienteID)
      .input('DescripcionTrabajo', sql.VarChar, DescripcionTrabajo)
      .input('Prioridad', sql.VarChar, Prioridad)
      .input('Variante', sql.VarChar, Variante)
      .input('Estado', sql.VarChar, Estado)
      .input('Progreso', sql.Int, Progreso)
      .input('MaquinaID', sql.VarChar, MaquinaID)
      .input('RolloID', sql.VarChar, RolloID)
      .input('Magnitud', sql.VarChar, Magnitud)
      .input('Nota', sql.Text, Nota)
      .input('FechaEstimadaEntrega', sql.DateTime, FechaEstimadaEntrega)
      .query(`
        UPDATE Ordenes SET
          AreaID = @AreaID,
          ClienteID = @ClienteID,
          DescripcionTrabajo = @DescripcionTrabajo,
          Prioridad = @Prioridad,
          Variante = @Variante,
          Estado = @Estado,
          Progreso = @Progreso,
          MaquinaID = @MaquinaID,
          RolloID = @RolloID,
          Magnitud = @Magnitud,
          Nota = @Nota,
          FechaEstimadaEntrega = @FechaEstimadaEntrega
        WHERE OrdenID = @OrdenID
      `);

    res.json({ message: 'Orden actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Eliminar orden
app.delete('/api/ordenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.request()
      .input('OrdenID', sql.VarChar, id)
      .query('DELETE FROM Ordenes WHERE OrdenID = @OrdenID');

    res.json({ message: 'Orden eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🏭 ENDPOINTS PARA MÁQUINAS
app.get('/api/maquinas', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT m.*, a.Nombre as AreaNombre 
      FROM Maquinas m 
      LEFT JOIN Areas a ON m.AreaID = a.AreaID 
      WHERE m.EsActivo = 1
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 👥 ENDPOINTS PARA CLIENTES
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM Clientes WHERE EsActivo = 1');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📍 ENDPOINTS PARA ÁREAS
app.get('/api/areas', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM Areas WHERE EsActivo = 1');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📁 ENDPOINTS PARA ARCHIVOS DE ORDEN
app.get('/api/archivos/:ordenId', async (req, res) => {
  try {
    const { ordenId } = req.params;
    const result = await pool.request()
      .input('ordenId', sql.VarChar, ordenId)
      .query('SELECT * FROM ArchivosOrden WHERE OrdenID = @ordenId');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 💬 ENDPOINTS PARA MENSAJES
app.get('/api/mensajes/:ordenId', async (req, res) => {
  try {
    const { ordenId } = req.params;
    const result = await pool.request()
      .input('ordenId', sql.VarChar, ordenId)
      .query('SELECT * FROM Mensajes WHERE OrdenID = @ordenId ORDER BY FechaHora DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mensajes', async (req, res) => {
  try {
    const { OrdenID, Usuario, Rol, Texto, Tipo } = req.body;
    const result = await pool.request()
      .input('OrdenID', sql.VarChar, OrdenID)
      .input('Usuario', sql.VarChar, Usuario)
      .input('Rol', sql.VarChar, Rol)
      .input('Texto', sql.Text, Texto)
      .input('Tipo', sql.VarChar, Tipo)
      .query(`
        INSERT INTO Mensajes (OrdenID, Usuario, Rol, Texto, Tipo)
        VALUES (@OrdenID, @Usuario, @Rol, @Texto, @Tipo)
      `);
    res.status(201).json({ message: 'Mensaje enviado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔧 ENDPOINTS PARA TICKETS DE MANTENIMIENTO
app.get('/api/tickets', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT t.*, m.Nombre as MaquinaNombre 
      FROM TicketsMantenimiento t
      LEFT JOIN Maquinas m ON t.MaquinaID = m.MaquinaID
      ORDER BY t.FechaReporte DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando',
    database: pool ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// Test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT @@VERSION as version, GETDATE() as server_time');
    res.json({ 
      message: '✅ Conexión a la base de datos exitosa',
      data: result.recordset[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   http://localhost:${PORT}/api/health`);
  console.log(`   http://localhost:${PORT}/api/ordenes`);
  console.log(`   http://localhost:${PORT}/api/maquinas`);
  console.log(`   http://localhost:${PORT}/api/clientes`);
  console.log(`   http://localhost:${PORT}/api/areas`);
});