const { getPool, sql } = require('../../config/db');

async function run() {
    try {
        const pool = await getPool();

        console.log("Starting Migration: Multi-Currency Support for PreciosBase...");

        // 1. Find Constraint Name dynamically
        const res = await pool.request().query("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'PreciosBase' AND COLUMN_NAME = 'CodArticulo' AND CONSTRAINT_NAME LIKE 'UQ%'");
        if (res.recordset.length > 0) {
            const constraintName = res.recordset[0].CONSTRAINT_NAME;
            console.log(`Dropping constraint: ${constraintName}`);
            await pool.request().query(`ALTER TABLE PreciosBase DROP CONSTRAINT ${constraintName}`);
        } else {
            console.log("No UQ constraint found on CodArticulo (maybe already dropped)");
        }

        // 2. Add New Composite Constraint
        try {
            await pool.request().query("ALTER TABLE PreciosBase ADD CONSTRAINT UQ_PreciosBase_Cod_Moneda UNIQUE (CodArticulo, Moneda)");
            console.log("Added constraint UQ_PreciosBase_Cod_Moneda");
        } catch (e) {
            console.log("Constraint UQ_PreciosBase_Cod_Moneda might already exist or error: " + e.message);
        }

    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        process.exit();
    }
}
run();
