const { sql, getPool } = require('../../config/db');

async function checkSchema() {
    try {
        const pool = await getPool();

        console.log("--- TABLE: PreciosBase ---");
        const resTable = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PreciosBase'");
        resTable.recordset.forEach(c => console.log(`${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        // Check Keys
        console.log("\n--- KEYS: PreciosBase ---");
        const resKeys = await pool.request().query(`
            SELECT 
                K.TABLE_NAME, 
                K.COLUMN_NAME, 
                K.CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS C 
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS K ON C.TABLE_NAME = K.TABLE_NAME 
                AND C.CONSTRAINT_NAME = K.CONSTRAINT_NAME 
            WHERE C.TABLE_NAME = 'PreciosBase'
        `);
        resKeys.recordset.forEach(k => console.log(`${k.CONSTRAINT_NAME}: ${k.COLUMN_NAME}`));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkSchema();
