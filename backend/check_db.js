const { getPool } = require('./config/db');
async function check() {
  const pool = await getPool();
  try {
    const res1 = await pool.request().query("SELECT name FROM sys.tables WHERE name IN ('CuentasCliente', 'MovimientosCuenta', 'DeudaDocumento', 'CondicionesPago')");
    console.log("Tablas existentes:", res1.recordset.map(r => r.name));
    
    const res2 = await pool.request().query("SELECT name FROM sys.procedures WHERE name IN ('SP_RegistrarMovimiento', 'SP_ImputarPagoPEPS')");
    console.log("SPs existentes:", res2.recordset.map(r => r.name));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
