const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getPool } = require('../config/db');

async function runSqlFile() {
    try {
        const sqlPath = path.join(__dirname, '../database/sp_PoblarEstadosArchivo.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Eliminar 'GO' ya que mssql driver no siempre lo soporta en bloque único
        const statements = sqlContent.split(/\bGO\b/i);

        const pool = await getPool();

        for (const statement of statements) {
            if (statement.trim()) {
                await pool.request().query(statement);
            }
        }

        console.log("SP Creado/Actualizado.");

        // Ejecutar el SP
        console.log("Ejecutando sp_PoblarEstadosArchivo...");
        const result = await pool.request().query("EXEC sp_PoblarEstadosArchivo");
        console.table(result.recordset);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

runSqlFile();
