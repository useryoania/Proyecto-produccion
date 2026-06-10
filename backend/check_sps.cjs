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

const scriptPath = 'c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\03-STORED_PROCEDURES.sql';
const scriptContent = fs.readFileSync(scriptPath, 'utf8').toLowerCase();

const requiredSPs = [
    'SP_AbrirSesionCaja',
    'SP_CerrarSesionCaja',
    'SP_ImputarPagoPEPS',
    'SP_RegistrarMovimiento',
    'SP_SiguienteNumeroDoc'
];

async function getSpDefinition(pool, spName) {
    const res = await pool.request()
        .input('spName', sql.NVarChar, spName)
        .query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID(@spName)) AS def
        `);
    if(res.recordset.length === 0 || !res.recordset[0].def) return null;
    return res.recordset[0].def;
}

async function run() {
    try {
        const missingSPs = [];
        for (const sp of requiredSPs) {
            if (!scriptContent.includes(sp.toLowerCase())) {
                missingSPs.push(sp);
            }
        }

        if (missingSPs.length === 0) {
            console.log("ALL_OK");
            return;
        }

        console.log("Missing SPs:", missingSPs);

        const pool = await sql.connect({ ...configBase, database: 'SecureAppDB' });
        
        let outputSql = 'USE [importa];\nGO\n\n-- ============================================================================\n-- STORED PROCEDURES FALTANTES (COMPLEMENTO A 03-STORED_PROCEDURES.sql)\n-- ============================================================================\n\n';

        for (const sp of missingSPs) {
            const def = await getSpDefinition(pool, sp);
            if (def) {
                // If the definition starts with CREATE PROCEDURE, we leave it as is or add IF EXISTS DROP.
                // Usually it's better to just output the definition + GO.
                // Let's add a DROP IF EXISTS just in case.
                outputSql += `IF OBJECT_ID('dbo.${sp}', 'P') IS NOT NULL DROP PROCEDURE dbo.${sp};\nGO\n\n`;
                outputSql += `${def}\nGO\n\n`;
            } else {
                console.log(`WARNING: SP ${sp} not found in DB SecureAppDB`);
            }
        }
        
        fs.writeFileSync('c:\\Integracion\\User-Macrosoft\\Proyecto-produccion\\backend\\Para Migrar\\03.5-STORED_PROCEDURES_TEMP.sql', outputSql);
        console.log("DONE");

        await pool.close();
    } catch(err) {
        console.error(err);
    }
}
run();
