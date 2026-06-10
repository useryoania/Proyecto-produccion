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

async function run() {
    try {
        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        let outputSql = 'USE [importa];\nGO\n\n-- ============================================================================\n-- ACTUALIZACION DE DATOS EN COLUMNAS NUEVAS DE ARTICULOS\n-- ============================================================================\n\n';

        const res = await pool.request().query(`SELECT ProIdProducto, UniIdUnidad, borrar FROM [dbo].[Articulos] WHERE UniIdUnidad IS NOT NULL OR borrar IS NOT NULL`);
        if (res.recordset.length > 0) {
            outputSql += `-- Updates for Articulos\n`;
            for (const row of res.recordset) {
                let updates = [];
                if (row.UniIdUnidad !== null) updates.push(`[UniIdUnidad] = ${row.UniIdUnidad}`);
                if (row.borrar !== null) updates.push(`[borrar] = ${row.borrar}`);
                outputSql += `UPDATE [dbo].[Articulos] SET ${updates.join(', ')} WHERE [ProIdProducto] = ${row.ProIdProducto};\n`;
            }
            outputSql += 'GO\n\n';
            fs.writeFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\04.6-UPDATE_ARTICULOS.sql', outputSql);
            console.log("Update script generated: 04.6-UPDATE_ARTICULOS.sql");
        } else {
            console.log("No updates needed");
        }

        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
