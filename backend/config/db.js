const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: 1433, // Aseguramos el puerto
    requestTimeout: 60000,
    options: {
        // 👇 COPIADO DE TU TEST EXITOSO
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

let poolPromise = null;

const getPool = async () => {
    try {
        if (poolPromise) {
            return await poolPromise;
        }

        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then(pool => {
                console.log('✅ Conectado a MSSQL');
                return pool;
            })
            .catch(err => {
                console.error('❌ Error conectando a MSSQL:', err);
                poolPromise = null; // Reset promise on error
                throw err;
            });

        return await poolPromise;
    } catch (err) {
        console.error('❌ Error en getPool:', err);
        throw err;
    }
};

module.exports = { sql, getPool, poolPromise };