const sql = require('mssql');
const { getPool } = require('./config/db');

async function run() {
  try {
    const pool = await getPool();
    
    // Get MovimientosCuenta for the last payment
    const movs = await pool.request().query(`
      SELECT TOP 10 m.MovIdMovimiento, m.MovTipo, m.MovConcepto, m.MovImporte, m.MovFecha, m.DocIdDocumento, m.OrdIdOrden, m.PagIdPago
      FROM dbo.MovimientosCuenta m 
      ORDER BY m.MovIdMovimiento DESC
    `);
    console.log("Recent Movimientos:", movs.recordset);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
