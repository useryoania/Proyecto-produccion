const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getPool } = require('../config/db');

async function inspectFallas() {
    try {
        const pool = await getPool();
        // Intentar un insert dummy fallido para ver errores o select top 1
        const result = await pool.request().query("SELECT TOP 0 * FROM FallasProduccion");
        console.log("Columnas FallasProduccion:", result.recordset.columns); // columns contiene metadata si recordset vacio
        // Si columns no es visible asi en mssql/tedious, hacemos un select schema
        const schema = await pool.request().query(`
            SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'FallasProduccion'
        `);
        console.table(schema.recordset);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

inspectFallas();
