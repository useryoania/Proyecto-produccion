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

const tablesWithNewCols = {
  'PreciosBase': { pk: 'ID', cols: ['MonIdMoneda', 'ProIdProducto'] },
  'PerfilesPrecios': { pk: 'ID', cols: ['Categoria'] },
  'PreciosEspeciales': { pk: 'ID', cols: ['CliIdCliente'] },
  'Rollos': { pk: 'RolloID', cols: ['UsuarioID'] },
  'PreciosEspecialesItems': { pk: 'ItemID', cols: ['MonIdMoneda', 'ProIdProducto', 'CliIdCliente', 'CodGrupo'] },
  'PreciosListaPublica': { pk: 'Id', cols: ['FiltroLanding'] },
  'PerfilesItems': { pk: 'ID', cols: ['MonIdMoneda', 'ProIdProducto', 'CodGrupo'] },
  'MetodosPagos': { pk: 'MPaIdMetodoPago', cols: ['MPaAfectaCaja', 'MPaTipo', 'MPaActivo'] },
  'ConfigMapeoERP': { pk: 'CodigoERP', cols: ['Tipo'] }
};

async function run() {
    try {
        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        let outputSql = 'USE [importa];\nGO\n\n-- ============================================================================\n-- ACTUALIZACION DE DATOS EN COLUMNAS NUEVAS RELACIONADAS A PRECIOS Y CONFIG\n-- ============================================================================\n\n';

        let updatesFound = false;
        for (const [table, info] of Object.entries(tablesWithNewCols)) {
            const pkCol = info.pk;
            for (const col of info.cols) {
                const res = await pool.request().query(`SELECT [${pkCol}], [${col}] FROM [dbo].[${table}] WHERE [${col}] IS NOT NULL`);
                if (res.recordset.length > 0) {
                    updatesFound = true;
                    outputSql += `-- Updates for ${table}.${col}\n`;
                    for (const row of res.recordset) {
                        let val = row[col];
                        if (val === null || val === undefined) continue;
                        if (typeof val === 'string') val = `'${val.replace(/'/g, "''")}'`;
                        else if (typeof val === 'boolean') val = val ? '1' : '0';
                        else if (val instanceof Date) val = `'${val.toISOString()}'`;
                        
                        let pkVal = row[pkCol];
                        if (typeof pkVal === 'string') pkVal = `'${pkVal.replace(/'/g, "''")}'`;
                        
                        outputSql += `UPDATE [dbo].[${table}] SET [${col}] = ${val} WHERE [${pkCol}] = ${pkVal};\n`;
                    }
                    outputSql += 'GO\n\n';
                }
            }
        }

        if(updatesFound) {
            fs.writeFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\04.7-UPDATE_PRECIOS_Y_CONFIG.sql', outputSql);
            console.log("Update script generated: 04.7-UPDATE_PRECIOS_Y_CONFIG.sql");
        } else {
            console.log("No updates needed");
        }
        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
