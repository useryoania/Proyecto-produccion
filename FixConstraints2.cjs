const { sql, getPool } = require('./backend/config/db');

async function Run() {
    const pool = await getPool();
    try {
        await pool.request().query("ALTER TABLE DeudaDocumento ADD CONSTRAINT DF_DeudaDocumento_DDeCuotaNumero DEFAULT 1 FOR DDeCuotaNumero;");
        console.log("DEFAULT 1 added to DDeCuotaNumero");
    } catch(e) {
        console.error("Error DDeCuotaNumero:", e.message);
    }

    try {
        await pool.request().query("ALTER TABLE DeudaDocumento ADD CONSTRAINT DF_DeudaDocumento_DDeTotalCuotas DEFAULT 1 FOR DDeTotalCuotas;");
        console.log("DEFAULT 1 added to DDeTotalCuotas");
    } catch(e) {
        console.error("Error DDeTotalCuotas:", e.message);
    }
    
    // Just in case there are other non-null integer fields
    try {
        await pool.request().query("ALTER TABLE MovimientosCuenta ADD CONSTRAINT DF_MovimientosCuenta_MovCuota DEFAULT 1 FOR MovCuota;");
    } catch(e) {}
    
    try {
        await pool.request().query("ALTER TABLE MovimientosCuenta ADD CONSTRAINT DF_MovimientosCuenta_MovTotalCuotas DEFAULT 1 FOR MovTotalCuotas;");
    } catch(e) {}

    process.exit(0);
}
Run();
