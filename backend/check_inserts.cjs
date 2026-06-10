const fs = require('fs');
const path = require('path');
const sql = require('mssql');
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

const scriptPath = 'c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\04-POBLAR_TABLAS_DIRECTO.sql';
const scriptContent = fs.readFileSync(scriptPath, 'utf8').toLowerCase();

const configTables = [
    'ConfiguracionPrecios',
    'TesoreriaBancos',
    'Config_TiposDocumento',
    'Config_CuentasEgreso',
    'CondicionesPago',
    'TiposMovimiento',
    'Cont_PlanCuentas',
    'Cont_TiposTransaccion',
    'Cont_EventosContables',
    'Cont_ReglasEventos',
    'Cont_ReglasContables',
    'Cont_ReglasAsiento',
    'Config_CFE',
    'Articulos_Wms',
    'Articulos_WMS_Variantes',
    'Articulos_Imagenes',
    'Articulos_UbicacionLocal',
    'CiclosCredito',
    'SecuenciaDocumentos'
];

async function generateInsert(pool, tableName) {
    const dataRes = await pool.request().query(`SELECT * FROM [dbo].[${tableName}]`);
    if(dataRes.recordset.length === 0) return null;

    const colsRes = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IsIdentity
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
    `);
    
    const cols = colsRes.recordset.map(c => c.COLUMN_NAME);
    const hasIdentity = colsRes.recordset.some(c => c.IsIdentity === 1);
    
    let sqlStr = `-- Data for ${tableName}\n`;
    if(hasIdentity) {
        sqlStr += `SET IDENTITY_INSERT [dbo].[${tableName}] ON;\n`;
    }
    
    for (const row of dataRes.recordset) {
        const vals = cols.map(c => {
            const val = row[c];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'boolean') return val ? '1' : '0';
            return val;
        });
        sqlStr += `INSERT INTO [dbo].[${tableName}] ([${cols.join('], [')}]) VALUES (${vals.join(', ')});\n`;
    }

    if(hasIdentity) {
        sqlStr += `SET IDENTITY_INSERT [dbo].[${tableName}] OFF;\n`;
    }
    sqlStr += 'GO\n\n';
    return sqlStr;
}

async function run() {
    try {
        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        
        let outputSql = 'USE [importa];\nGO\n\n-- ============================================================================\n-- POBLAR DATOS FALTANTES (COMPLEMENTO A 04-POBLAR_TABLAS_DIRECTO.sql)\n-- ============================================================================\n\n';
        let foundMissing = false;

        for (const table of configTables) {
            // Check if table has data in SecureAppDB
            const countRes = await pool.request().query(`SELECT COUNT(*) as C FROM [dbo].[${table}]`);
            const count = countRes.recordset[0].C;
            
            if (count > 0) {
                // Check if the script contains INSERT INTO table
                if (!scriptContent.includes(`insert into [dbo].[${table.toLowerCase()}]`) && !scriptContent.includes(`insert into dbo.[${table.toLowerCase()}]`) && !scriptContent.includes(`insert into ${table.toLowerCase()}`)) {
                    console.log(`Table ${table} has ${count} rows but no INSERTs found in script 04.`);
                    const inserts = await generateInsert(pool, table);
                    if(inserts) {
                        outputSql += inserts;
                        foundMissing = true;
                    }
                }
            }
        }
        
        if(foundMissing) {
            fs.writeFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\04.5-POBLAR_TABLAS_TEMP.sql', outputSql);
            console.log("Missing data scripts generated to 04.5-POBLAR_TABLAS_TEMP.sql");
        } else {
            console.log("ALL_OK");
        }

        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
