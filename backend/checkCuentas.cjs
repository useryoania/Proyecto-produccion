require('dotenv').config();
const { getPool } = require('./config/db');
async function run() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Cont_PlanCuentas'
    `);
    console.dir(result.recordset);
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
