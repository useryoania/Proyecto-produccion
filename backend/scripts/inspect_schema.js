
const { sql, getPool } = require('../config/db');

async function inspect() {
    try {
        const pool = await getPool();
        console.log("Connected. Inspecting tables...");

        const tables = ['ArchivosOrden', 'Etiquetas', 'ConfiguracionGlobal'];

        for (const table of tables) {
            console.log(`\n--- ${table} Columns ---`);
            const res = await pool.request()
                .input('TableName', sql.NVarChar, table)
                .query(`
                    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = @TableName
                `);
            console.table(res.recordset);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

inspect();
