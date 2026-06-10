const { getPool } = require('./config/db');

async function run() {
  const pool = await getPool();
  try {
    const res = await pool.request().query(`
      UPDATE PedidosCobranza
      SET MontoContabilizado = 0, MetrosContabilizados = 0
      WHERE ID IN (
          SELECT pc.ID
          FROM PedidosCobranza pc
          LEFT JOIN MovimientosCuenta mc ON mc.MovConcepto LIKE '%' + CAST(pc.NoDocERP AS VARCHAR(30)) + '%'
          WHERE pc.MontoContabilizado > 0 OR pc.MetrosContabilizados > 0
          GROUP BY pc.ID
          HAVING COUNT(mc.MovIdMovimiento) = 0
      )
    `);
    console.log(`Updated ${res.rowsAffected[0]} records in PedidosCobranza.`);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
