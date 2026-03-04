const sql = require('mssql');

// Configuración de la base de datos
const config = {
  user: 'adminuser',
  password: 'adminvilardebo2031@',
  server: '127.0.0.1', // Cambia según corresponda
  database: 'master',
  options: {
    encrypt: false, // Solo para Azure
    enableArithAbort: true,
  },
  port: 1433,
  pool: {
    max: 80, // Número máximo de conexiones en el pool
    min: 0, // Número mínimo de conexiones en el pool
    idleTimeoutMillis: 15000 // Tiempo en milisegundos antes de cerrar una conexión inactiva
  },
  requestTimeout: 60000,
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Conectado a MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos: ', err);
  });

module.exports = {
  sql, 
  poolPromise
};
