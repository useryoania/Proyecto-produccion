const { sql, getPool } = require('./config/db');
async function run() {
  const pool = await getPool();
  try {
    // 1. Marcar Doc 4 como ANULADO
    await pool.request().query(`
      UPDATE DocumentosContables SET DocEstado = 'ANULADO' WHERE DocIdDocumento = 4;
      UPDATE DeudaDocumento SET DDeEstado = 'CANCELADA', DDeImportePendiente = 0 WHERE DocIdDocumento = 4;
      
      -- Set the cycle 1 as anulado to be clean
      UPDATE CiclosCredito SET CicEstado = 'ANULADO' WHERE CicIdCiclo = 1;

      -- Move the orders from cycle 1 to cycle 4 (which is ABIERTO) and clear their DocId
      UPDATE MovimientosCuenta
      SET CicIdCiclo = 4, DocIdDocumento = NULL
      WHERE CicIdCiclo = 1 AND MovTipo IN ('ORDEN', 'ORDEN_ANTICIPO');
      
      -- Also if there is a CIERRE_CICLO movement for Doc 4, delete it
      DELETE FROM MovimientosCuenta WHERE DocIdDocumento = 4 AND MovTipo = 'CIERRE_CICLO';
    `);
    console.log("Reversión completada!");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
