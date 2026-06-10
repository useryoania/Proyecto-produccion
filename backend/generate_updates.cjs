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
  'PreciosBase': { pk: ['PreIdPrecio'], cols: ['MonIdMoneda', 'ProIdProducto'] },
  'PerfilesPrecios': { pk: ['PerfilID'], cols: ['Categoria'] },
  'PreciosEspeciales': { pk: ['IdPre'], cols: ['CliIdCliente'] },
  'Rollos': { pk: ['RolloID'], cols: ['UsuarioID'] },
  'PreciosEspecialesItems': { pk: ['IdPreItem'], cols: ['MonIdMoneda', 'ProIdProducto', 'CliIdCliente', 'CodGrupo'] },
  'PreciosListaPublica': { pk: ['IdPlp'], cols: ['FiltroLanding'] },
  'PerfilesItems': { pk: ['IdPerItem'], cols: ['MonIdMoneda', 'ProIdProducto', 'CodGrupo'] },
  'MetodosPagos': { pk: ['MPaIdMetodoPago'], cols: ['MPaAfectaCaja', 'MPaTipo', 'MPaActivo'] },
  'ConfigMapeoERP': { pk: ['ID'], cols: ['Tipo'] },
  'Articulos': { pk: ['ProIdProducto'], cols: ['UniIdUnidad', 'borrar'] }
};

async function run() {
    try {
        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        let outputSql = 'USE [importa];\nGO\n\n-- ============================================================================\n-- ACTUALIZACION DE DATOS EN COLUMNAS NUEVAS DE TABLAS EXISTENTES\n-- ============================================================================\n\n';

        for (const [table, info] of Object.entries(tablesWithNewCols)) {
            const pkCol = info.pk[0]; // assuming single pk for simplicity
            for (const col of info.cols) {
                const res = await pool.request().query(`SELECT [${pkCol}], [${col}] FROM [dbo].[${table}] WHERE [${col}] IS NOT NULL`);
                if (res.recordset.length > 0) {
                    outputSql += `-- Updates for ${table}.${col}\n`;
                    for (const row of res.recordset) {
                        let val = row[col];
                        if (typeof val === 'string') val = `'${val.replace(/'/g, "''")}'`;
                        else if (typeof val === 'boolean') val = val ? '1' : '0';
                        outputSql += `UPDATE [dbo].[${table}] SET [${col}] = ${val} WHERE [${pkCol}] = ${row[pkCol]};\n`;
                    }
                    outputSql += 'GO\n\n';
                }
            }
        }

        fs.writeFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\04.6-UPDATE_COLUMNAS_NUEVAS.sql', outputSql);
        console.log("Update script generated: 04.6-UPDATE_COLUMNAS_NUEVAS.sql");
        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
