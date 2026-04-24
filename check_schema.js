const { getPool, sql } = require('./backend/config/db');
async function run() {
  const pool = await getPool();
  const res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosCobranzaDetalle'");
  console.log('Detalle:', res.recordset);
  const res2 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosCobranza'");
  console.log('Cabecera:', res2.recordset);
  process.exit();
}
run();
