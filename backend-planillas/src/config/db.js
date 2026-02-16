const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true // Importante para conexiones locales
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Conectado a MSSQL local');
        return pool;
    })
    .catch(err => {
        console.error('❌ Error de conexión a la DB:', err);
    });

module.exports = { sql, poolPromise };