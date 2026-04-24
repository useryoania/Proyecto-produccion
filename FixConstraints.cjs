const { sql, getPool } = require('./backend/config/db');

async function Run() {
    const pool = await getPool();
    try {
        await pool.request().query("ALTER TABLE MovimientosCuenta ADD CONSTRAINT DF_MovimientosCuenta_MovAnulado DEFAULT 0 FOR MovAnulado;");
        console.log("DEFAULT 0 added to MovAnulado");
    } catch(e) {
        console.error("Error MovAnulado:", e.message);
    }
    
    // Si faltan otros defaults comunes:
    try {
        await pool.request().query("ALTER TABLE DeudaDocumento ADD CONSTRAINT DF_DeudaDocumento_DDeEstado DEFAULT 1 FOR DDeEstado;");
        console.log("DEFAULT 1 added to DDeEstado");
    } catch (e) { }

    process.exit(0);
}
Run();
