const { sql, getPool } = require('./backend/config/db');

async function Run() {
    const pool = await getPool();
    try {
        await pool.request().query("ALTER TABLE DeudaDocumento ADD CONSTRAINT DF_DeudaDocumento_DDeCuotaTotal DEFAULT 1 FOR DDeCuotaTotal;");
        console.log("DEFAULT 1 added to DDeCuotaTotal");
    } catch(e) {
        console.error("Error DDeCuotaTotal:", e.message);
    }
    process.exit(0);
}
Run();
