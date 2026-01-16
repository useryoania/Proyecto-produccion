const sql = require('mssql');
require('dotenv').config({ path: 'c:\\Integracion\\User-Macrosoft\\backend\\.env' });
const { getPool } = require('c:\\Integracion\\User-Macrosoft\\backend\\config\\db');

async function getSPText() {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query("sp_helptext 'sp_GetOrdenesControl_V2'");

        result.recordset.forEach(row => {
            process.stdout.write(row.Text);
        });

    } catch (err) {
        console.error(err);
    }
}

getSPText();
