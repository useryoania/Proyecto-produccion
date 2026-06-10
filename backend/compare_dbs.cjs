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

async function getSchema(dbName) {
    const pool = await sql.connect({ ...configBase, database: dbName });
    const tablesRes = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    const tables = tablesRes.recordset.map(r => r.TABLE_NAME);

    const colsRes = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
        FROM INFORMATION_SCHEMA.COLUMNS
    `);
    const columns = colsRes.recordset;

    const spsRes = await pool.request().query(`
        SELECT ROUTINE_NAME 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_TYPE = 'PROCEDURE'
    `);
    const sps = spsRes.recordset.map(r => r.ROUTINE_NAME);

    await pool.close();
    return { tables, columns, sps };
}

async function run() {
    try {
        const dbOld = 'SecureAppDB2205'; // Target (production)
        const dbNew = 'SecureAppDB'; // Source (new features)

        console.log('Fetching schema for', dbOld);
        const schemaOld = await getSchema(dbOld);
        console.log('Fetching schema for', dbNew);
        const schemaNew = await getSchema(dbNew);

        // Missing tables
        const missingTables = schemaNew.tables.filter(t => !schemaOld.tables.includes(t));
        
        // Missing SPs
        const missingSPs = schemaNew.sps.filter(sp => !schemaOld.sps.includes(sp));

        // Missing Columns in existing tables
        const missingColumns = [];
        for (const col of schemaNew.columns) {
            if (schemaOld.tables.includes(col.TABLE_NAME)) { // Only check tables that exist in old DB
                const exists = schemaOld.columns.find(c => c.TABLE_NAME === col.TABLE_NAME && c.COLUMN_NAME === col.COLUMN_NAME);
                if (!exists) {
                    missingColumns.push(col);
                }
            }
        }

        console.log('\n=======================================');
        console.log('=== TABLAS FALTANTES EN ' + dbOld + ' ===');
        console.log('=======================================');
        missingTables.forEach(t => console.log('- ' + t));

        console.log('\n=======================================');
        console.log('=== COLUMNAS FALTANTES ===');
        console.log('=======================================');
        const groupedCols = {};
        missingColumns.forEach(c => {
            if (!groupedCols[c.TABLE_NAME]) groupedCols[c.TABLE_NAME] = [];
            groupedCols[c.TABLE_NAME].push(c);
        });
        for (const t in groupedCols) {
            console.log(`\nTabla: ${t}`);
            groupedCols[t].forEach(c => {
                console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : ''})`);
            });
        }

        console.log('\n=======================================');
        console.log('=== STORED PROCEDURES FALTANTES ===');
        console.log('=======================================');
        missingSPs.forEach(sp => console.log('- ' + sp));

    } catch(err) {
        console.error(err);
    }
}
run();
