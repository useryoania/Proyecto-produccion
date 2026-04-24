const { sql, getPool } = require('./backend/config/db');

async function Run() {
    const pool = await getPool();
    try {
        await pool.request().query("ALTER TABLE PedidosCobranza ADD MontoContabilizado DECIMAL(18,2) DEFAULT 0");
        console.log("MontoContabilizado ✅");
    } catch (e) {
        if(e.message.includes('already has a column')) console.log("MontoContabilizado ALREADY EXISTS");
        else console.error("Error MontoContabilizado:", e.message);
    }
    
    try {
        await pool.request().query("ALTER TABLE PedidosCobranza ADD MetrosContabilizados DECIMAL(18,2) DEFAULT 0");
        console.log("MetrosContabilizados ✅");
    } catch (e) {
        if(e.message.includes('already has a column')) console.log("MetrosContabilizados ALREADY EXISTS");
        else console.error("Error MetrosContabilizados:", e.message);
    }
    process.exit(0);
}
Run();
