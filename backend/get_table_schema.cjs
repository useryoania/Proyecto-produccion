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

async function getTableSchema(dbName, tableName) {
    const pool = await sql.connect({ ...configBase, database: dbName });
    const colsRes = await pool.request()
        .input('TableName', sql.NVarChar, tableName)
        .query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @TableName
            ORDER BY ORDINAL_POSITION
        `);
    
    let stmt = `CREATE TABLE [dbo].[${tableName}] (\n`;
    const cols = colsRes.recordset.map(c => {
        let typeStr = c.DATA_TYPE;
        if (c.DATA_TYPE === 'nvarchar' || c.DATA_TYPE === 'varchar') {
            typeStr += `(${c.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : c.CHARACTER_MAXIMUM_LENGTH})`;
        } else if (c.DATA_TYPE === 'decimal' || c.DATA_TYPE === 'numeric') {
            // Default 18,2 for simplicity unless we query exactly
            typeStr += `(18,2)`;
        }
        return `    [${c.COLUMN_NAME}] ${typeStr} ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`;
    });
    stmt += cols.join(',\n');
    stmt += '\n);\nGO\n';
    
    await pool.close();
    return stmt;
}

async function run() {
    try {
        const dbNew = 'SecureAppDB';
        console.log(await getTableSchema(dbNew, 'Temp_Articulos_Maestros'));
        console.log(await getTableSchema(dbNew, 'Temp_WMS_Maestros'));
    } catch(err) {
        console.error(err);
    }
}
run();
