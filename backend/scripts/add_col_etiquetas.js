const { getPool, sql } = require('../config/db');

async function run() {
    try {
        const pool = await getPool();
        await pool.request().query("IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'Usuario' AND Object_ID = Object_ID(N'dbo.Etiquetas')) ALTER TABLE dbo.Etiquetas ADD Usuario VARCHAR(100);");
        console.log("Column Usuario added (or existed).");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
