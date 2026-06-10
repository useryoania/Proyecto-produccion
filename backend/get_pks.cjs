const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const configBase = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: false,
        trustServerCertificate: true
    }
};

async function getPkName(pool, table) {
    const res = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + QUOTENAME(CONSTRAINT_NAME)), 'IsPrimaryKey') = 1
        AND TABLE_NAME = '${table}'
    `);
    if (res.recordset.length > 0) return res.recordset[0].COLUMN_NAME;
    
    // If no PK, just get the first column
    const fallbackRes = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}' AND ORDINAL_POSITION=1
    `);
    return fallbackRes.recordset[0].COLUMN_NAME;
}

async function run() {
    try {
        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        
        const tables = [
            'PreciosBase', 'PerfilesPrecios', 'PreciosEspeciales', 'PreciosEspecialesItems',
            'PerfilesItems', 'PreciosListaPublica', 'MetodosPagos', 'ConfigMapeoERP'
        ];
        
        for (const t of tables) {
            const pk = await getPkName(pool, t);
            console.log(`Table: ${t}, PK: ${pk}`);
        }
        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
